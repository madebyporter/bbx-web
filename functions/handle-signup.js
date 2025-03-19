export const handler = async (event, context) => {
  const data = JSON.parse(event.body);
  const { user } = data;
    
  const responseBody = {
    app_metadata: {
      roles: ["admin"],
    },
    user_metadata: {
      ...user.user_metadata
    }
  };

  return {
    statusCode: 200,
    body: JSON.stringify(responseBody)
  };
}; 