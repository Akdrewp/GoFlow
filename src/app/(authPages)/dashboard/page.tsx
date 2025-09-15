"use client";

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const settingsApiEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/auth/login`;

export default function Dashboard() {

  console.log("DASHBOARD CONSOLE LOG");
  return (
    <div className="text-card-foreground">
      <button type="button" onClick={ (() => {
              void (async () => {
                const signInApiResponse = await fetch(settingsApiEndpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer fakeToken`,
                  },
                  body: JSON.stringify({
                    name: "James Paul"
                  }),
                });
                
                console.log("signin api post response", signInApiResponse);
              })();
          })}>
            Send Post request
      </button>
    </div>
  );
}