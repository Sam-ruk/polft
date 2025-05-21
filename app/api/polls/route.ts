// import { NextResponse } from "next/server";
// import { connectDB, Poll } from "@/lib/db";

// export async function GET(request: Request) {
//   await connectDB();
//   const { searchParams } = new URL(request.url);
//   const ca = searchParams.get("ca");
//   const polls = ca ? await Poll.find({ ca }) : await Poll.find();
//   return NextResponse.json(polls);
// }

// export async function POST(request: Request) {
//   await connectDB();
//   const { ca, Q, Ans, time, voted } = await request.json();
//   if (!ca || !Q || !Ans || !time) {
//     return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
//   }
//   const poll = new Poll({ ca, Q, Ans, time, voted: voted || [] });
//   await poll.save();
//   return NextResponse.json(poll);
// }

// export async function PUT(request: Request) {
//   await connectDB();
//   const { ca, fid, option } = await request.json();
//   if (!ca || !fid || !option) {
//     return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
//   }
//   const poll = await Poll.findOneAndUpdate(
//     { ca, voted: { $ne: fid } },
//     {
//       $push: { voted: fid },
//       $inc: { "Ans.$[elem].count": 1 },
//     },
//     { arrayFilters: [{ "elem.option": option }], new: true }
//   );
//   if (!poll) {
//     return NextResponse.json({ error: "Poll not found or already voted" }, { status: 400 });
//   }
//   return NextResponse.json(poll);
// }
