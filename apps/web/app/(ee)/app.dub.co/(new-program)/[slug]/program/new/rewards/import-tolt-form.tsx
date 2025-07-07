"use client";

import { setToltTokenAction } from "@/lib/actions/partners/set-tolt-token";
import useWorkspace from "@/lib/swr/use-workspace";
import { ToltProgram } from "@/lib/tolt/types";
import { ProgramData } from "@/lib/types";
import { Button, Input } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useState } from "react";
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { toast } from "sonner";

type FormProps = {
  register: UseFormRegister<ProgramData>;
  watch: UseFormWatch<ProgramData>;
  setValue: UseFormSetValue<ProgramData>;
};

export const ImportToltForm = ({ register, watch, setValue }: FormProps) => {
  const [token, setToken] = useState("");
  const { id: workspaceId } = useWorkspace();
  const [toltProgramId, setToltProgramId] = useState("");
  const [toltProgram, setToltProgram] = useState<ToltProgram | null>(null);

  const { executeAsync, isPending } = useAction(setToltTokenAction, {
    onSuccess: ({ data }) => {
      if (data?.program) {
        setToltProgram(data.program);

        setValue("tolt", {
          id: data.program.id,
          name: data.program.name,
          subdomain: data.program.subdomain,
          payout_term: data.program.payout_term,
          total_affiliates: data.program.total_affiliates,
          maskedToken: token,
        });
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const handleFetchProgram = async () => {
    if (!workspaceId || !token || !toltProgramId) {
      return;
    }

    await executeAsync({
      workspaceId,
      toltProgramId,
      token,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-neutral-800">
          Tolt API Key
        </label>
        <Input
          type="password"
          placeholder="API token"
          className="max-w-full"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <div className="mt-2 text-xs font-normal leading-[1.1] text-neutral-600">
          You can find your Tolt API key on your{" "}
          <Link
            href="https://app.tolt.io/settings?tab=integrations"
            className="underline decoration-solid decoration-auto underline-offset-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            Integrations tab
          </Link>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-800">
          Tolt Program ID
        </label>
        <Input
          type="text"
          placeholder="Program ID"
          className="max-w-full"
          value={toltProgramId}
          onChange={(e) => setToltProgramId(e.target.value)}
        />
        <div className="mt-2 text-xs font-normal leading-[1.1] text-neutral-600">
          You can find your program ID in your{" "}
          <Link
            href="https://app.tolt.io/program-settings?page=general-settings"
            className="underline decoration-solid decoration-auto underline-offset-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            General settings tab
          </Link>
        </div>
      </div>

      {toltProgram && (
        <div className="grid grid-cols-2 gap-6 rounded-lg border border-neutral-300 bg-neutral-50 p-6">
          <div>
            <div className="text-sm text-neutral-500">Name</div>
            <div className="text-sm font-medium text-neutral-800">
              {toltProgram.name}
            </div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Subdomain</div>
            <div className="text-sm font-medium text-neutral-800">
              {toltProgram.subdomain}
            </div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Payout Term</div>
            <div className="text-sm font-medium text-neutral-800">
              {toltProgram.payout_term} days
            </div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Total Partners</div>
            <div className="text-sm font-medium text-neutral-800">
              {toltProgram.total_affiliates?.toLocaleString() || "0"}
            </div>
          </div>
        </div>
      )}

      {!toltProgram && (
        <Button
          text="Fetch program"
          className="w-full"
          disabled={!token || !toltProgramId}
          loading={isPending}
          onClick={handleFetchProgram}
        />
      )}
    </div>
  );
};
