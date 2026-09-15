import { nextJsConfig } from "@workspace/eslint-config/next-js"

/**
 * axios 호출은 features/<도메인>/api/ 파일 안에서만 하고, 그 밖에서는
 * 거기서 export한 TanStack Query 훅을 조합해 쓴다는 규약을 강제한다.

 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...nextJsConfig,
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["features/*/api/**", "lib/**", "**/__test__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/axios",
              importNames: ["default", "axiosInstance"],
              message:
                "axiosInstance는 features/<도메인>/api/ 안에서만 사용하세요. 통신 로직을 전용 파일로 분리하고 TanStack Query 훅(useQuery/useMutation)을 export해 조합하세요. 예시: features/file-browser/api/createBrowserItem.ts",
            },
          ],
        },
      ],
    },
  },
]
