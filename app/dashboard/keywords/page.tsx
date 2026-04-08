import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserKeywords } from "@/data/keywords";
import KeywordsClient from "./_components/keywords-client";

export default async function KeywordsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const keywords = await getUserKeywords(userId);

  return <KeywordsClient keywords={keywords} />;
}
