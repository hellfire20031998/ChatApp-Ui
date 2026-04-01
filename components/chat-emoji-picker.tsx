"use client";

import dynamic from "next/dynamic";
import data from "@emoji-mart/data";

const Picker = dynamic(() => import("@emoji-mart/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[352px] w-[352px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
      Loading emojis…
    </div>
  ),
});

type EmojiMartSelect = { native: string };

type ChatEmojiPickerProps = {
  theme: "light" | "dark";
  onSelect: (emoji: string) => void;
};

export function ChatEmojiPicker({ theme, onSelect }: ChatEmojiPickerProps) {
  return (
    <Picker
      data={data}
      theme={theme}
      previewPosition="none"
      skinTonePosition="search"
      maxFrequentRows={2}
      onEmojiSelect={(emoji: EmojiMartSelect) => onSelect(emoji.native)}
    />
  );
}
