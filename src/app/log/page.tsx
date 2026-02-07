import AttendanceLogger from "@/components/AttendanceLogger";

export default function LogPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Session Logger</h1>
        <p className="text-slate-400">Select a student to deduct training hours.</p>
      </div>
      <AttendanceLogger />
    </div>
  );
}