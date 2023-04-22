export const handler = async (event: {
  url: string;
  method: string;
  body?: any;
}) => {
  const resp = await fetch(event.url, {
    method: event.method,
    body: JSON.stringify(event.body),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const respBody = await resp.json();
  return respBody;
};
