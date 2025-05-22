"use client";

import { SafeAreaContainer } from "@/components/safe-area-container";
import { PolFT } from "@/components/polft";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";

export default function Home() {
  const { context } = useMiniAppContext();

  return (
    <div className="overflow-x-hidden">
      <SafeAreaContainer insets={context?.client.safeAreaInsets} className="overflow-x-hidden">
        <PolFT />
      </SafeAreaContainer>
    </div>
  );
}
