"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { listBootstrap } from "@/lib/client-db";

interface TeamItem {
  id: string;
  name: string;
  emblem: string;
}

type Step = "identity" | "pick-team" | "gm-password";

const GM_PASSWORD = "@abc12345";

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identity");
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [eventName, setEventName] = useState("棕熊營闖關活動");
  const [gmPassword, setGmPassword] = useState("");
  const [gmPasswordError, setGmPasswordError] = useState("");

  useEffect(() => {
    void listBootstrap()
      .then((data) => {
        setTeams(data.teams ?? []);
        if (data.event?.name) setEventName(data.event.name);
      })
      .catch(() => undefined);
  }, []);

  function chooseStudent() {
    sessionStorage.setItem("role", "student");
    setStep("pick-team");
  }

  function chooseGm() {
    setGmPassword("");
    setGmPasswordError("");
    setStep("gm-password");
  }

  function submitGmPassword(event: FormEvent) {
    event.preventDefault();
    if (gmPassword !== GM_PASSWORD) {
      setGmPasswordError("密碼錯誤，請再試一次");
      return;
    }
    sessionStorage.setItem("role", "gm");
    router.push("/gm");
  }

  return (
    <div className="home-screen mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <header className="mb-8 text-center">
        <p className="text-xs tracking-[0.35em] text-[#9bb6d4]">BROWN BEAR CAMP</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-wide text-[#f0c674]">
          棕熊營系統
        </h1>
        <p className="mt-3 text-sm text-[#b8cce0]">{eventName}</p>
      </header>

      {step === "identity" && (
        <section className="flex flex-1 flex-col justify-center gap-5">
          <div className="mb-2 text-center">
            <p className="text-xs tracking-[0.3em] text-[#f0c674]/80">STEP 1</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">請選擇身分</h2>
            <p className="mt-2 text-sm text-[#9bb6d4]">學員與關主請先選定身分再進入</p>
          </div>

          <button
            type="button"
            onClick={chooseStudent}
            className="rounded-3xl border-2 border-[#f0c674] bg-[#0d2244] p-7 text-left transition hover:bg-[#12315a] active:scale-[0.99]"
          >
            <p className="text-xs tracking-[0.3em] text-[#9bb6d4]">STUDENT</p>
            <h3 className="mt-2 text-3xl font-bold text-[#f0c674]">學員</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#b8cce0]">
              查看闖關進度、出示小隊專屬 QR Code
            </p>
          </button>

          <button
            type="button"
            onClick={chooseGm}
            className="rounded-3xl border-2 border-[#f0c674]/70 bg-[#0d2244]/90 p-7 text-left transition hover:border-[#f0c674] hover:bg-[#12315a] active:scale-[0.99]"
          >
            <p className="text-xs tracking-[0.3em] text-[#9bb6d4]">GAME MASTER</p>
            <h3 className="mt-2 text-3xl font-bold text-[#f0c674]">關主</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#b8cce0]">
              鎖定關卡、掃描 QR、判定通過／不通過
            </p>
          </button>
        </section>
      )}

      {step === "gm-password" && (
        <section className="flex flex-1 flex-col">
          <button
            type="button"
            onClick={() => {
              setGmPassword("");
              setGmPasswordError("");
              setStep("identity");
            }}
            className="mb-5 self-start text-sm text-[#9bb6d4]"
          >
            ← 返回選擇身分
          </button>

          <div className="mb-6 text-center">
            <p className="text-xs tracking-[0.3em] text-[#f0c674]/80">GAME MASTER</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">關主密碼</h2>
            <p className="mt-2 text-sm text-[#9bb6d4]">請輸入密碼後進入關主台</p>
          </div>

          <form
            onSubmit={submitGmPassword}
            className="rounded-3xl border-2 border-[#f0c674]/70 bg-[#0d2244]/90 p-6"
          >
            <label htmlFor="gm-password" className="block text-sm text-[#b8cce0]">
              密碼
            </label>
            <input
              id="gm-password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={gmPassword}
              onChange={(e) => {
                setGmPassword(e.target.value);
                if (gmPasswordError) setGmPasswordError("");
              }}
              className="mt-2 w-full rounded-xl border border-[#f0c674]/40 bg-[#071428] px-4 py-3 text-base text-white outline-none ring-[#f0c674] placeholder:text-[#6f87a3] focus:border-[#f0c674] focus:ring-1"
              placeholder="請輸入關主密碼"
            />
            {gmPasswordError && (
              <p className="mt-3 text-sm text-[#ff8f8f]" role="alert">
                {gmPasswordError}
              </p>
            )}
            <button
              type="submit"
              className="mt-5 w-full rounded-2xl bg-[#f0c674] px-4 py-3 text-base font-semibold text-[#0a1931] transition hover:bg-[#f6d48a] active:scale-[0.99]"
            >
              進入關主台
            </button>
          </form>
        </section>
      )}

      {step === "pick-team" && (
        <section className="flex flex-1 flex-col">
          <button
            type="button"
            onClick={() => setStep("identity")}
            className="mb-5 self-start text-sm text-[#9bb6d4]"
          >
            ← 返回選擇身分
          </button>

          <div className="mb-5 text-center">
            <p className="text-xs tracking-[0.3em] text-[#f0c674]/80">學員</p>
            <h2 className="mt-2 text-xl font-semibold text-white">選擇你的小隊</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => {
                  sessionStorage.setItem("teamId", team.id);
                  router.push(`/team/${team.id}`);
                }}
                className="rounded-2xl border border-[#f0c674]/45 bg-[#0d2244]/70 px-3 py-5 text-center transition hover:border-[#f0c674] hover:bg-[#12315a]"
              >
                <div className="text-3xl text-[#f0c674]">{team.emblem}</div>
                <div className="mt-2 text-sm text-[#d7e6f7]">{team.name}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
