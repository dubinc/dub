"use client";

import { setToltTokenAction } from "@/lib/actions/partners/set-tolt-token";
import useWorkspace from "@/lib/swr/use-workspace";
import { ToltProgram } from "@/lib/tolt/types";
import { ProgramData } from "@/lib/types";
import { Button, Input } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { toast } from "sonner";

type FormProps = {
  watch: UseFormWatch<ProgramData>;
  setValue: UseFormSetValue<ProgramData>;
};

type Step = "set-token" | "program-info";

export const ImportToltForm = ({ watch, setValue }: FormProps) => {
  const [step, setStep] = useState<Step>("set-token");
  const [toltProgram, setToltProgram] = useState<ToltProgram | null>(null);

  const tolt = watch("tolt");

  useEffect(() => {
    if (tolt) {
      setToltProgram(tolt);
      setStep("program-info");
    }
  }, [tolt]);

  return (
    <>
      {step === "set-token" ? (
        <ToltTokenForm
          setStep={setStep}
          setToltProgram={setToltProgram}
          setValue={setValue}
        />
      ) : (
        <ToltProgramInfo toltProgram={toltProgram!} />
      )}
    </>
  );
};

function ToltTokenForm({
  setStep,
  setToltProgram,
  setValue,
}: {
  setStep: (step: Step) => void;
  setToltProgram: (program: ToltProgram | null) => void;
  setValue: UseFormSetValue<ProgramData>;
}) {
  const [token, setToken] = useState("");
  const { id: workspaceId } = useWorkspace();
  const [toltProgramId, setToltProgramId] = useState("");

  const { executeAsync, isPending } = useAction(setToltTokenAction, {
    onSuccess: ({ data }) => {
      if (data?.program) {
        setToltProgram(data.program);

        setValue("tolt", {
          ...data.program,
          maskedToken: token,
        });

        setStep("program-info");
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
          className="mt-2 max-w-full"
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
          className="mt-2 max-w-full"
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

      <Button
        text={isPending ? "Fetching program..." : "Fetch program"}
        className="w-full"
        disabled={!token || !toltProgramId}
        loading={isPending}
        onClick={handleFetchProgram}
      />
    </div>
  );
}

function ToltProgramInfo({ toltProgram }: { toltProgram: ToltProgram }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-3 text-sm font-medium text-neutral-700">
          Program Information
        </h4>
        <dl className="grid grid-cols-2 gap-3 rounded-md border border-neutral-200 bg-white p-4 text-xs">
          <div>
            <dt className="text-neutral-500">Name</dt>
            <dd className="font-medium text-neutral-700">{toltProgram.name}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Subdomain</dt>
            <dd className="font-medium text-neutral-700">
              {toltProgram.subdomain}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Payout Term</dt>
            <dd className="font-medium text-neutral-700">
              {toltProgram.payout_term} days
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Total Partners</dt>
            <dd className="font-medium text-neutral-700">
              {toltProgram.affiliates?.toLocaleString() || "0"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
