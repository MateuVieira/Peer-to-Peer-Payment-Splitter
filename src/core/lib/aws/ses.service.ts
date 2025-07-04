import {
  SendEmailCommand,
  SendEmailCommandInput,
  SendEmailCommandOutput,
  SESClient,
} from "@aws-sdk/client-ses";
import { config } from "../../../config.js";
import { v4 as uuidv4 } from "uuid";

interface SendEmailParams {
  toAddresses: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

const CHARSET = "UTF-8";

export class SESService {
  private sesClient: SESClient;

  constructor() {
    this.sesClient = new SESClient({
      region: config.aws.region,
    });
  }

  async sendEmail(input: SendEmailParams): Promise<string | undefined> {
    const { toAddresses, subject, body, htmlBody } = input;

    if (!body && !htmlBody) {
      throw new Error("Email must have either a body or an htmlBody.");
    }

    const bodyParams = body ? { Text: { Data: body, Charset: CHARSET } } : undefined;
    const htmlBodyParams = htmlBody ? { Html: { Data: htmlBody, Charset: CHARSET } } : undefined;

    const params: SendEmailCommandInput = {
      Source: config.aws.sourceEmail,
      Destination: {
        ToAddresses: [toAddresses],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: CHARSET,
        },
        Body: {
          ...bodyParams,
          ...htmlBodyParams,
        },
      },
    };

    try {
      // For the test we will only generate a random message id
      // Im don't have a domain to validate the email
      // then I can only send for valid emails of the account
      const hasSESConfigs = config.aws.sourceEmail && config.aws.region;
      let response: SendEmailCommandOutput;

      if (!hasSESConfigs) {
        response = await Promise.resolve({
          MessageId: uuidv4(),
          $metadata: {
            httpStatusCode: 200,
          },
        });
      } else {
        response = await this.sesClient.send(new SendEmailCommand(params));
      }

      console.log(
        `Email sent successfully. Message ID: ${response.MessageId}, To: ${params.Destination?.ToAddresses?.[0] || toAddresses}`
      );
      return response.MessageId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      throw new Error(`Error sending email via SES: ${errorMessage}`);
    }
  }
}
