"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
// import Badge from "../ui/badge/Badge";
import supabase from "../../../SupabaseConfig";
// import { toast } from "sonner";

interface Profile {
  id: number | string;
  user_id: number | string;
  symbol: string;
  question: string;
  answer: string;
  email: string;
}

export default function ChatTable() {
  const [ChatHistory, setChatHistory] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // async function fetchChatHistory() {
    //   try {
    //     setLoading(true);

    //     const { data, error } = await supabase
    //       .from("chat_history")
    //       .select("id,user_id, symbol, question,answer")
    //        .order("created_at", { ascending: false }); 

    //     if (error) throw error;

     

    //     setChatHistory(data);
    //   } catch (err: any) {
    //     console.error("Error fetching profiles:", err);
    //     setError("Failed to load data. Please try again later.");
    //   } finally {
    //     setLoading(false);
    //   }
    // }

    async function fetchChatHistory() {
  try {
    setLoading(true);

    // 1️⃣ Get chat history
    const { data: chatData, error: chatError } = await supabase
      .from("chat_history")
      .select("id,user_id,symbol,question,answer")
      .order("created_at", { ascending: false });

    if (chatError) throw chatError;

    // 2️⃣ Extract unique user ids
    const userIds = [...new Set(chatData.map((item) => item.user_id))];

    // 3️⃣ Fetch profiles for those users
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,email")
      .in("id", userIds);

    if (profileError) throw profileError;

    // 4️⃣ Create email map
    const emailMap: Record<string | number, string> = {};
    profileData.forEach((profile) => {
      emailMap[profile.id] = profile.email;
    });

    // 5️⃣ Merge email into chat history
    const mergedData = chatData.map((chat) => ({
      ...chat,
      email: emailMap[chat.user_id] || "N/A",
    }));

    setChatHistory(mergedData);

  } catch (err) {
    console.error("Error fetching chat history:", err);
    setError("Failed to load data. Please try again later.");
  } finally {
    setLoading(false);
  }
}

    fetchChatHistory();
  }, []);


  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading Chats...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (ChatHistory.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No Chat History found.
      </div>
    );
  }


  console.log(ChatHistory)
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="w-full">
        <div className="w-full">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Id
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                 Email
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Symbol
                </TableCell>

                  <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Question
                </TableCell>

                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Answer
                </TableCell>
               
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {ChatHistory.map((items) => (
                <TableRow key={items.id}>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                     {items.id}
                  </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                     {items.email}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {items.symbol}
                  </TableCell>   
                   <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {items.question}
                  </TableCell> 
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {items.answer}
                  </TableCell>            
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}