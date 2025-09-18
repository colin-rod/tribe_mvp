import { LinearClient } from "@linear/sdk";

const client = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY, // set in your env vars
});

async function main() {
  const projects = await client.projects();
  projects.nodes.forEach((p) => {
    console.log(`Name: ${p.name}, ID: ${p.id}, Slug: ${p.slug}`);
  });
}

main().catch(console.error);