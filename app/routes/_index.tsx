import { useLoaderData } from "react-router-dom";
import { FruitAnalyzer } from "~/modules/agentic/components/fruit-analyzer";

// 1. Export the loader function returning your JSON
export function loader() {
  return { message: "Hello" };
}

export default function IndexPage() {
  // 2. Consume the data using the useLoaderData hook
  // Assuming TypeScript, we can cast the type here for intellisense
  const data = useLoaderData() as { message: string };

  return (
    <div>
      {/* 3. Render the message from the loader */}
      <h1>{data.message}</h1>
    </div>
  );
}