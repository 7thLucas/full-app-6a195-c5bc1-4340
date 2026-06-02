import { useLoaderData } from "react-router";
import { FruitAnalyzer } from "~/modules/agentic/components/fruit-analyzer";

// 1. This runs exclusively on your Express server
export async function loader() {
  // You can safely use Mongoose/Typegoose or Node modules here
  return { message: "Hello" };
}

export default function IndexPage() {
  // 2. React Router v7 natively infers the return type of your loader
  const data = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col space-y-4">
      {/* 3. Render the message */}
      <h1 className="text-2xl font-bold">{data.message}</h1>
    </div>
  );
}