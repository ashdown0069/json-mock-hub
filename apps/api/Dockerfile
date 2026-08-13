# =========================================================================
# Base Image: 모든 스테이지의 공통 기반 이미지
# slim 변형을 사용하여 glibc 기반 native 바이너리(bcrypt 등) 호환성을 보장합니다.
# =========================================================================
FROM node:20-slim AS base

# =========================================================================
# Stage 1: Prepare (준비 단계)
# 모노레포 전체 코드에서 api 앱을 빌드하는 데 필요한 패키지 구조만 솎아냅니다.
# =========================================================================
FROM base AS prepare
WORKDIR /app
# Turborepo 전역 명령어를 사용하기 위해 turbo를 설치합니다.
RUN npm install -g turbo
# 현재 프로젝트의 모든 파일을 도커 컨텍스트로 복사합니다.
COPY . .
# api 서비스와 그에 의존하는 로컬 패키지만 추출하여 /app/out 폴더에 저장합니다.
RUN turbo prune api --docker


# =========================================================================
# Stage 2: Builder (빌드 단계)
# 솎아낸 설정을 바탕으로 의존성(node_modules)을 설치하고 NestJS를 빌드합니다.
# =========================================================================
FROM base AS builder
WORKDIR /app

# 1. 솎아낸 패키지 설정 파일들(package.json 등)만 먼저 복사합니다. (레이어 캐싱 활용)
COPY --from=prepare /app/out/json/ .


# 2. turbo prune이 만들어 준 pruned lockfile로 설치합니다.
#    npm install --no-package-lock을 쓰면 lockfile이 무시되어 빌드마다
#    transitive 의존성 버전이 달라지고, 검증한 것과 다른 이미지가 배포됩니다.
RUN npm ci

# 3. 실제 소스 코드(.ts 파일 등)를 복사합니다.
COPY --from=prepare /app/out/full/ .

# 4. Turborepo를 이용해 api 프로젝트와 하위 의존 패키지들을 함께 빌드합니다.
RUN npx turbo run build --filter=api...


# =========================================================================
# Stage 3: Runner (실행 단계)
# 빌드가 완료된 결과물만 가져와서 아주 가볍고 안전한 환경에서 앱을 구동합니다.
# =========================================================================
# Builder와 동일한 base(slim) 이미지를 사용합니다.
# alpine(musl libc)과 slim(glibc) 간 native 바이너리(esbuild 등) ABI 불일치를 방지합니다.
FROM base AS runner
WORKDIR /app

# 애플리케이션 환경 변수를 프로덕션(운영)으로 설정합니다.
ENV NODE_ENV=production

# Builder 단계에서 완성된 의존성과 빌드 결과물(dist) 전체를 먼저 복사합니다. (root 권한으로 복사)
COPY --from=builder /app .


# [보안 설정] root 권한으로 프로세스가 실행되는 것을 막기 위해 비루트(non-root) 유저를 생성합니다.
RUN addgroup --system --gid 1001 jhk
RUN adduser --system --uid 1001 jhk

# 소유권을 생성된 비루트 유저(jhk)에게 양도하여 권한 에러를 사전 차단합니다.
RUN chown -R jhk:jhk /app

USER jhk

# 컨테이너 외부로 노출할 포트를 지정합니다.
EXPOSE 8001


# NestJS 앱을 실행합니다. 
# 모노레포 구조 상 루트 기준 최하위 빌드 파일의 경로인 apps/api/dist/main.js를 실행합니다.
CMD ["node", "apps/api/dist/main.js"]