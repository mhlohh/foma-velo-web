import React, { useMemo, useState } from 'react';
import { Plus, Trophy, Target, X, Cloud } from 'lucide-react';
import { ActivityEntity, PmcSummary } from '../../../types';
import { useTheme } from '../../../context/ThemeContext';
import { readableText } from '../../../utils/contrastText';

interface HomePageProps {
  summary: PmcSummary;
  activities: ActivityEntity[];
  userName?: string | null;
  onAddWorkoutClick: () => void;
  onImportClick: () => void;
}

type Goal = { id: number; text: string; done: boolean };

const PLAN_TAGS = [
  'Boost Your Threshold',
  'Base Training',
  'Ride 100 Miles',
  'Virtual Training/Racing',
  'Cyclocross',
  'Strength Training',
];

export const HomePage: React.FC<HomePageProps> = ({
  summary,
  activities,
  userName,
  onAddWorkoutClick,
  onImportClick,
}) => {
  const { isDark } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [showCoachBanner, setShowCoachBanner] = useState(true);

  const todayActs = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    return activities.filter((a) => {
      const d = new Date(a.dateMillis);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === key;
    });
  }, [activities]);

  const tomorrowActs = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    const key = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
    return activities.filter((a) => {
      const d = new Date(a.dateMillis);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === key;
    });
  }, [activities]);

  const addGoal = () => {
    if (!newGoal.trim()) return;
    setGoals((prev) => [...prev, { id: Date.now(), text: newGoal.trim(), done: false }]);
    setNewGoal('');
    setShowGoalInput(false);
  };

  const WorkoutRow: React.FC<{ label: string; acts: ActivityEntity[] }> = ({ label, acts }) => (
    <div className={`border-b pb-4 mb-4 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">{label}</h3>
        <button
          onClick={onAddWorkoutClick}
          className="text-slate-400 hover:text-[#2f6fe4] transition-colors"
          title="Add workout"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {acts.length === 0 ? (
        <div className="text-center py-6">
          <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            You have no scheduled workouts {label.toLowerCase()}.
          </p>
          <button
            onClick={onAddWorkoutClick}
            className="inline-flex items-center gap-2 bg-[#2f6fe4] hover:bg-[#245cc4] text-white text-sm font-bold px-6 py-2.5 rounded-full transition-colors"
          >
            Add a Workout
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {acts.map((act) => (
            <div
              key={act.id}
              className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 ${
                act.isPlanned
                  ? 'border-purple-300 bg-purple-50/60 dark:bg-purple-950/20 dark:border-purple-800'
                  : isDark
                  ? 'border-slate-700 bg-slate-800'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div>
                <div className="text-sm font-bold">{act.name}</div>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {Math.round(act.movingTimeSec / 60)} min
                  {act.distanceMeters > 0 && ` · ${(act.distanceMeters / 1000).toFixed(1)} km`}
                </div>
              </div>
              {act.isPlanned && (
                <span className="text-[9px] font-bold text-purple-700 bg-purple-100 dark:bg-purple-900 dark:text-purple-300 px-1.5 py-0.5 rounded">
                  PLANNED
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#2f6fe4] text-white flex items-center justify-center text-xl font-black">
          {(userName || 'A')[0].toUpperCase()}
        </div>
        <h1 className="text-2xl font-black">{userName || 'Athlete'}</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: training plans / events / goals */}
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-black mb-1">Training Plans</h2>
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Beat your best with these structured training plans.
            </p>
            <div className="flex flex-wrap gap-2">
              {PLAN_TAGS.map((tag) => (
                <span
                  key={tag}
                  className={`text-xs font-semibold border rounded-full px-3 py-1.5 ${
                    isDark
                      ? 'border-slate-600 text-slate-300'
                      : 'border-slate-300 text-slate-700'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black">Events</h2>
              <Plus className="w-4 h-4 text-slate-400" />
            </div>
            <div
              className={`border rounded-lg p-4 ${
                isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <Trophy className="w-8 h-8 text-[#2f6fe4] shrink-0" />
                <div>
                  <h3 className="font-bold text-sm mb-1">What are you training for?</h3>
                  <p className={`text-xs leading-relaxed mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Keep track of your upcoming events (A-races, gran fondos, sportives) and stay
                    focused with a countdown. Plan a taper by targeting +10 to +25 TSB on event day.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black">Goals</h2>
              <button onClick={() => setShowGoalInput(true)} className="text-slate-400 hover:text-[#2f6fe4]">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div
              className={`border rounded-lg p-4 ${
                isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-white'
              }`}
            >
              {goals.length === 0 && !showGoalInput && (
                <div className="text-center py-2">
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Stay on track by adding your training goals.
                  </p>
                  <p className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Examples:
                  </p>
                  <p className={`text-xs italic ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Work on a smooth pedal stroke
                    <br />
                    Stretch after every ride
                  </p>
                  <button
                    onClick={() => setShowGoalInput(true)}
                    className="mt-4 inline-flex items-center gap-1.5 border border-[#2f6fe4] text-[#2f6fe4] text-xs font-bold px-4 py-1.5 rounded-full hover:bg-[#eef3fd] transition-colors"
                  >
                    <Target className="w-3.5 h-3.5" />
                    Add goal
                  </button>
                </div>
              )}

              {goals.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {goals.map((goal) => (
                    <li key={goal.id} className="flex items-center justify-between gap-2 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={goal.done}
                          onChange={() =>
                            setGoals((prev) =>
                              prev.map((g) => (g.id === goal.id ? { ...g, done: !g.done } : g))
                            )
                          }
                          className="accent-[#2f6fe4] w-4 h-4"
                        />
                        <span className={goal.done ? 'line-through text-slate-400' : ''}>
                          {goal.text}
                        </span>
                      </label>
                      <button
                        onClick={() => setGoals((prev) => prev.filter((g) => g.id !== goal.id))}
                        className="text-slate-300 hover:text-rose-500 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {showGoalInput && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addGoal();
                  }}
                  className="flex gap-2"
                >
                  <input
                    autoFocus
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="e.g. Stretch after every ride"
                    className={`flex-1 text-xs border rounded-md px-3 py-2 focus:outline-none focus:border-[#2f6fe4] ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300'
                    }`}
                  />
                  <button
                    type="submit"
                    className="bg-[#2f6fe4] text-white text-xs font-bold px-3.5 py-2 rounded-md"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>

        {/* Center: today / tomorrow */}
        <div>
          <WorkoutRow label="Today" acts={todayActs} />
          <WorkoutRow label="Tomorrow" acts={tomorrowActs} />

          <div className="text-center mt-2">
            <button
              onClick={onImportClick}
              className={`text-xs font-semibold underline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              or import your Strava archive
            </button>
          </div>
        </div>

        {/* Right: performance metrics */}
        <div className="space-y-4">
          {showCoachBanner && (
            <div
              className={`relative border rounded-lg p-4 ${
                isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-white'
              }`}
            >
              <button
                onClick={() => setShowCoachBanner(false)}
                className="absolute top-2.5 right-2.5 text-slate-300 hover:text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-bold text-[#2f6fe4] mb-2">Need Help Reaching Your Goals?</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="border border-[#2f6fe4] text-[#2f6fe4] font-bold px-3 py-1.5 rounded-full">
                  Ask the AI Coach
                </span>
              </div>
            </div>
          )}

          <section>
            <h2 className="text-lg font-black mb-3">Performance Metrics</h2>

            <div className="flex justify-center gap-1.5 mb-4">
              {/* Fatigue */}
              <div className="text-center">
                <div className="w-[86px] h-[64px] border-2 border-[#ec4899] rounded-t-lg rounded-b-none border-b-0" />
                <div className="bg-[#be185d] text-white text-[11px] font-black tracking-wider py-1.5 rounded-b-lg">
                  FATIGUE
                </div>
                <div className="text-sm font-black mt-1" style={{ color: readableText('#ec4899', isDark) }}>
                  {summary.currentAtl.toFixed(0)}
                </div>
              </div>
              {/* Fitness */}
              <div className="text-center">
                <div className="w-[86px] h-[80px] bg-[#2f6fe4] rounded-t-lg" />
                <div className="bg-[#1d4ed8] text-white text-[11px] font-black tracking-wider py-1.5 rounded-b-lg -mt-[52px] relative top-[52px]">
                  FITNESS
                </div>
                <div className="text-sm font-black mt-1" style={{ color: readableText('#1d4ed8', isDark) }}>
                  {summary.currentCtl.toFixed(0)}
                </div>
              </div>
              {/* Form */}
              <div className="text-center">
                <div className="w-[86px] h-[64px] border-2 border-[#f59e0b] rounded-t-lg rounded-b-none border-b-0" />
                <div className="bg-[#b45309] text-white text-[11px] font-black tracking-wider py-1.5 rounded-b-lg">
                  FORM
                </div>
                <div className="text-sm font-black mt-1" style={{ color: readableText('#f59e0b', isDark) }}>
                  {summary.currentTsb >= 0 ? `+${summary.currentTsb.toFixed(0)}` : summary.currentTsb.toFixed(0)}
                </div>
              </div>
            </div>

            <div className={`text-xs space-y-2 border-t pt-3 ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
              <p>
                <strong>Form status:</strong>{' '}
                <span style={{ color: readableText(summary.formStatus.colorHex, isDark) }} className="font-bold">
                  {summary.formStatus.title}
                </span>
              </p>
              <p>{summary.formStatus.description}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 font-medium">
                <span>
                  Weekly Load:{' '}
                  <strong className={isDark ? 'text-slate-100' : 'text-slate-900'}>
                    {Math.round(summary.weeklyTss ?? summary.totalTssLast7d)} TSS
                  </strong>
                </span>
                {summary.weeklyHours ? (
                  <span>
                    Weekly Time:{' '}
                    <strong className={isDark ? 'text-slate-100' : 'text-slate-900'}>
                      {summary.weeklyHours.toFixed(1)} h
                    </strong>
                  </span>
                ) : null}
                <span>
                  Ramp:{' '}
                  <strong className={isDark ? 'text-slate-100' : 'text-slate-900'}>
                    {summary.rampRate7d >= 0 ? '+' : ''}
                    {summary.rampRate7d.toFixed(1)}/wk
                  </strong>
                </span>
              </div>
            </div>
          </section>

          <div
            className={`rounded-lg p-3.5 flex items-center gap-2.5 text-xs ${
              isDark ? 'bg-[#eef3fd]/10 text-slate-300' : 'bg-[#eef3fd] text-slate-600'
            }`}
          >
            <Cloud className="w-4 h-4 text-[#2f6fe4] shrink-0" />
            <span>
              Activities and thresholds sync in real time via <strong>Supabase</strong> under your
              account.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
