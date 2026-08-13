import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CommonService {
  private readonly logger = new Logger(CommonService.name);
  constructor(private readonly httpService: HttpService) {}
  async sendMessageToDiscord(
    title: string,
    description: string,
    type: 'Error' | 'Feedback' | 'Alert',
    feedbackEmail?: string,
  ) {
    //dev 환경에서는 비활성화
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `개발 환경 sendMessageToDiscord 실행됨: ${title} - ${description}`,
      );
      return true;
    }
    feedbackEmail = feedbackEmail ?? '없음'; // feedbackEmail이 undefined 또는 null이면 'test'를 할당
    const colorMap = {
      Error: 16711680,
      Feedback: 255,
      Alert: 16776960,
    };
    // .env.example에서 선택 항목으로 정의된 값이다.
    // 없으면 알림만 건너뛰고 호출자에게는 성공으로 돌려준다.
    const discordWebHookURL = process.env.DISCORD_WEBHOOK_URL;
    if (!discordWebHookURL) {
      this.logger.warn('DISCORD_WEBHOOK_URL이 없어 알림 전송을 건너뜁니다.');
      return true;
    }
    try {
      await this.httpService.axiosRef.post(
        discordWebHookURL,
        {
          embeds: [
            {
              title: type + ': ' + title,
              description: description,
              color: colorMap[type],
              timestamp: new Date().toISOString(),
              footer: {
                text: 'Email: ' + feedbackEmail,
              },
            },
          ],
        },
        {
          baseURL: '',
        },
      );
    } catch (error) {
      this.logger.error('sendMessageToDiscord service error', error);
      return false;
    }

    return true;
  }
}
