import { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { SignJWT } from "jose";
import { URLSearchParams } from "url";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
    throw new Error("No body");
  }
  console.log(event.body);
  const body = new URLSearchParams(event.body);
  const client = body.get("client_id");
  const clientSecret = body.get("client_secret");

  if (!client || !clientSecret) {
    throw new Error("No client or clientSecret");
  }
  const secret = new TextEncoder().encode(process.env.TOKEN_SECRET);

  const jwt = await new SignJWT({ "urn:example:claim": true })
    .setExpirationTime("1h")
    .setProtectedHeader({ alg: "HS256" })

    .sign(secret);

  return {
    statusCode: 200,
    body: JSON.stringify({
      access_token: jwt,
      token_type: "Bearer",
      expires_in: 3600,
    }),
  };
};
