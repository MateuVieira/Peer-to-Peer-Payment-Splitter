import { SendEmailCommandInput, SESClient } from "@aws-sdk/client-ses";
import { config } from "../../../config.js";
import { v4 as uuidv4 } from "uuid";

interface SendEmailParams {
  toAddresses: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

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

    const bodyParams = body ? { Text: { Data: body, Charset: "UTF-8" } } : undefined;
    const htmlBodyParams = htmlBody ? { Html: { Data: htmlBody, Charset: "UTF-8" } } : undefined;

    const params: SendEmailCommandInput = {
      Source: config.aws.sourceEmail,
      Destination: {
        ToAddresses: [toAddresses],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
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
      // const response: SendEmailCommandOutput = await this.sesClient.send(new SendEmailCommand(params));

      const response = await Promise.resolve({
        MessageId: uuidv4(),
      });

      console.log(
        `Email sent successfully. Message ID: ${response.MessageId}, To: ${params.Destination?.ToAddresses?.[0]}`
      );
      return response.MessageId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      throw new Error(`Error sending email via SES: ${errorMessage}`);
    }
  }
}
