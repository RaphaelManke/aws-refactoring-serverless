import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { SQSEvent } from "aws-lambda";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

const dynamodb = new DynamoDB({});
const secretsmanager = new SecretsManager({});
class ApiClient {
  private credentialsSecret: string;
  private baseUrl: string;
  private clientCredentials: { clientId: string; clientSecret: string };

  private accessToken: string | undefined;
  private tokenUrl: string;
  private expireDate: number | undefined;

  constructor({
    credentialsSecret,
    baseUrl,
    tokenUrl,
  }: {
    credentialsSecret: string;
    baseUrl: string;
    tokenUrl: string;
  }) {
    this.credentialsSecret = credentialsSecret;
    this.baseUrl = baseUrl;
    this.tokenUrl = tokenUrl;
  }

  private async getAccessToken() {
    if (this.accessToken && this.expireDate && this.expireDate > Date.now()) {
      return this.accessToken;
    }
    const secretValue = await secretsmanager.getSecretValue({
      SecretId: this.credentialsSecret,
    });
    this.clientCredentials = JSON.parse(secretValue.SecretString!);

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientCredentials.clientId,
        client_secret: this.clientCredentials.clientSecret,
      }).toString(),
    });
    const json = await response.json();
    if (!json.access_token) {
      console.error("No access token", JSON.stringify(json));
      throw new Error("No access token");
    }
    this.accessToken = json.access_token;
    this.expireDate = Date.now() + json.expires_in * 1000;
    console.info("New access token", this.accessToken);
    return this.accessToken;
  }

  async getFraudProbability(orderId: string): Promise<number> {
    const accessToken = await this.getAccessToken();
    const requestUrl = this.baseUrl + `fraud-check/${orderId}`;
    const request = await fetch(requestUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!request.ok) {
      const body = await request.text();
      throw new Error(
        `Request failed: ${request.status} - ${body} - ${requestUrl}`
      );
    }
    const response = await request.json();
    console.debug("Got fraudProbability", JSON.stringify(response));
    return response.fraudProbability;
  }
}

const apiClient = new ApiClient({
  credentialsSecret: process.env.CREDENTIALS_SECRET!,
  baseUrl: process.env.BASE_URL!,
  tokenUrl: process.env.TOKEN_URL!,
});

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    if (record.body) {
      const plainJson = JSON.parse(record.body);
      const customerId = plainJson.customerId;

      const fraudProbability = await apiClient.getFraudProbability(customerId);

      await dynamodb.updateItem({
        TableName: process.env.TABLE_NAME!,
        Key: {
          orderId: {
            S: plainJson.orderId,
          },
        },

        UpdateExpression: "SET fraudProbability = :fraudProbability, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":fraudProbability": {
            S: fraudProbability.toString(),
          },
          ":updatedAt": {
            S: new Date().toISOString(),
          },
        },
      });
    } else {
      throw new Error("No body");
    }
  }
};
