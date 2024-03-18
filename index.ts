import { serve } from "bun";

// Define the request handler
async function handleRequest(req: Request) {
    // Respond with "Hello, world!" for every request
    return new Response("Hello, world!", {
        headers: { "content-type": "text/plain" },
    });
}

// Start the server on port 3000
serve({
    port: process.env.PORT || 3000,
    fetch: handleRequest,
});

console.log("Server running on http://localhost:3000");