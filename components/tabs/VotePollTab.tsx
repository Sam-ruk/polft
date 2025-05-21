"use client";

import { useEffect, useState } from "react";

interface VotePollTabProps {
  fid: string;
}

interface Poll {
  ca: string;
  Q: string;
  Ans: { option: string; count: number }[];
  time: string;
  voted: string[];
}

export const VotePollTab = ({ fid }: VotePollTabProps) => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const userResponse = await fetch(`/api/users?fid=${fid}`);
        const user = await userResponse.json();
        const bought = user.bought || [];
        const pollPromises = bought.map(async (ca: string) => {
          const pollResponse = await fetch(`/api/polls?ca=${ca}`);
          return await pollResponse.json();
        });
        const pollData = (await Promise.all(pollPromises)).flat();
        setPolls(pollData);
      } catch (error) {
        console.error("Failed to fetch polls:", error);
      } finally {
        setLoading(false);
      }
    };
    if (fid) fetchPolls();
  }, [fid]);

  const handleVote = async () => {
    if (!selectedPoll || !selectedOption) {
      setStatus("Please select a poll and an option.");
      return;
    }
    try {
      const response = await fetch("/api/polls", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ca: selectedPoll.ca, fid, option: selectedOption }),
      });
      if (!response.ok) throw new Error("Failed to vote");
      setStatus("Vote recorded successfully!");
      setSelectedPoll(null);
      setSelectedOption("");
      // Refresh polls
      const pollResponse = await fetch(`/api/polls?ca=${selectedPoll.ca}`);
      const updatedPolls = await pollResponse.json();
      setPolls((prev) =>
        prev.map((p) => (p.ca === selectedPoll.ca ? updatedPolls[0] : p))
      );
    } catch (error: any) {
      setStatus(`Failed to vote: ${error.message}`);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl transition-all duration-300">
      <h1 className="text-3xl font-bold text-black" style={{ fontFamily: "Pacifico" }}>
        Polls for Me
      </h1>
      {loading ? (
        <p className="mt-4 text-gray-600">Loading...</p>
      ) : polls.length === 0 ? (
        <p className="mt-4 text-gray-600">No polls available to vote on.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4">
          {polls.map((poll) => (
            <div
              key={poll.ca}
              className={`p-4 bg-gray-100 rounded-lg shadow ${poll.voted.includes(fid) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105 transition-transform"}`}
              onClick={() => !poll.voted.includes(fid) && setSelectedPoll(poll)}
            >
              <p className="text-gray-800 font-semibold">{poll.Q}</p>
              <p className="text-gray-600 text-sm">Ends: {new Date(poll.time).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
      {selectedPoll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1000] animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-lg transform transition-all duration-300 scale-100">
            <h2 className="text-2xl font-bold text-white mb-4" style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)" }}>
              Vote on Poll
            </h2>
            <p className="mb-3 text-gray-800">{selectedPoll.Q}</p>
            {selectedPoll.Ans.map((ans) => (
              <div key={ans.option} className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="poll-option"
                  value={ans.option}
                  checked={selectedOption === ans.option}
                  onChange={() => setSelectedOption(ans.option)}
                  className="h-4 w-4 text-[#800080]"
                />
                <label className="text-gray-800">{ans.option} ({ans.count} votes)</label>
              </div>
            ))}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleVote}
                className="px-6 py-3 bg-[#FFD700] text-[#4B0082] font-bold rounded-[15px] border-[3px] border-[#800080] shadow-md hover:bg-[#FFEC8B] hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Vote
              </button>
              <button
                onClick={() => {
                  setSelectedPoll(null);
                  setSelectedOption("");
                }}
                className="px-6 py-3 bg-white text-[#4B0082] font-bold rounded-[15px] border-[3px] border-[#800080] shadow-md hover:bg-[#FFEC8B] hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
            {status && (
              <p className={`mt-3 ${status.includes("Failed") ? "text-red-500" : "text-green-500"}`}>{status}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};