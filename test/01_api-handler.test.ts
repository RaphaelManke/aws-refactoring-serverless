import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { SSM } from "@aws-sdk/client-ssm";
import waitForExpect from "wait-for-expect";
const ssm = new SSM({});
const dynamodb = new DynamoDB({});

describe("API Handler", () => {
  let baseUrl: string;
  let tableName: string;
  beforeAll(async () => {
    baseUrl = await getParameter("/api-handler/baseurl");
    tableName = await getParameter("/table/name");
  });

  it("should return 200", async () => {
    const response = await fetch(baseUrl + "/orders", {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderDate: "2023-04-19T19:32:02.035Z",
        customerId: "123",
        productIds: ["1", "2", "3"],
        customerType: "existing",
      }),
      method: "POST",
    });
    // const respBodyText = await response.text();
    const respBody = await response.json();
    await sleep(1_500);
    const ddbItem = await dynamodb.getItem({
      TableName: tableName,
      Key: {
        orderId: {
          S: respBody.orderId,
        },
      },
    });

    expect(respBody).toEqual({
      orderId: expect.any(String),
      orderDate: "2023-04-19T19:32:02.035Z",
      customerId: "123",
      productIds: ["1", "2", "3"],
      customerType: "existing",

    });
    expect(response.status).toBe(200);

    expect(ddbItem.Item).toStrictEqual({
      orderId: {
        S: respBody.orderId,
      },
      orderDate: {
        S: "2023-04-19T19:32:02.035Z",
      },
      customerId: {
        S: "123",
      },
      productIds: {
        SS: ["1", "2", "3"],
      },
      customerType: {
        S: "existing",
      },
      fraudProbability:{
        S: expect.any(String),
      },
      createdAt:{
        S: expect.any(String),
      },
      updatedAt:{
        S: expect.any(String),
      } 

    });
    const createdAt = new Date(ddbItem.Item?.createdAt.S!).getTime()
    const updatedAt = new Date(ddbItem.Item?.updatedAt.S!).getTime()
    const time = updatedAt - createdAt
    console.log("Duration between createdAt and updatedAt: " + time + "ms")

  });

  it("should return 400", async () => {
    const response = await fetch(baseUrl + "/orders", {
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    expect(response.status).toBe(400);
  });
});

const getParameter = async (paramName: string) => {
  const resp = await ssm.getParameter({
    Name: paramName,
  });
  return resp.Parameter!.Value!;
};


const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));