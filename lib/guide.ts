/*
 * Ask Grow: a hand-written question & answer guide.
 * Nothing here calls an AI model. Each entry matches a question by keywords and builds its answer
 * from the user's own numbers on this device. The chat UI adds the conversational feel.
 */
import { CATS, type State, type TxType } from './data';
import {
  accName, allocation, avgMonthly, balances, catMap, catTotals, checkup, emi, invTotals, liquid,
  MILESTONES, money as rawMoney, monthLabel, monthsTo, monthTx, netWorth, nowKey, shiftMonth, sum,
} from './calc';

export type Tool = 'loan' | 'card' | 'invest';
export interface Reply { text: string; follow: string[]; tool?: Tool; topicId?: string }
interface Entry {
  id: string; topic: Topic; q: string;
  keys: string[];          // words or phrases; phrases score higher
  answer: (S: State, raw: string) => string;
  follow: string[];        // ids of related entries
  tool?: Tool;
}
export type Topic = 'Your money' | 'Saving' | 'Investing' | 'Loans & cards' | 'Basics';
export const TOPICS: Topic[] = ['Your money', 'Saving', 'Investing', 'Loans & cards', 'Basics'];

/* Answers talk in whole taka; the app screens keep paisa precision. */
const money = (p: number) => rawMoney(Math.round(p / 100) * 100);
const moneyT = (t: number) => money(Math.round(t * 100));

const CHECK = 'Rates and terms change, so confirm the current details with the bank or provider before you decide.';
const pct = (x: number) => Math.round(x * 100) + '%';
const when = (m: number | null) => m === null ? 'more than 60 years' : m === 0 ? 'already there' : m < 12 ? `about ${m} month${m === 1 ? '' : 's'}` : `about ${(m / 12).toFixed(1)} years`;
const daysLeftInMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1; };
const exampleNote = (S: State) => S.sample ? '\n\n_These are example numbers. Clear them in Settings to see your own._' : '';
const noData = 'I don’t have enough entries to go on yet. Add a few incomes and expenses (or load the example data in Settings) and ask me again.';
const hasData = (S: State) => S.txs.length > 0;

function amountIn(raw: string): number | null {
  const m = raw.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|lakh|lac|l|cr|crore)?\b/i);
  if (!m) return null;
  let v = parseFloat(m[1]);
  const u = (m[2] || '').toLowerCase();
  if (u === 'k') v *= 1e3; else if (u === 'l' || u === 'lakh' || u === 'lac') v *= 1e5; else if (u === 'cr' || u === 'crore') v *= 1e7;
  return v > 0 ? Math.round(v * 100) : null;
}

const E: Entry[] = [
  /* ---------------- Your money ---------------- */
  {
    id: 'where', topic: 'Your money', q: 'Where did my money go this month?',
    keys: ['where', 'money go', 'spent', 'spending', 'breakdown', 'categories', 'expenses this month', 'spend most'],
    follow: ['compare', 'biggest', 'save'],
    answer: S => {
      const mk = nowKey(), cur = monthTx(S, mk), exp = sum(cur, 'expense'), top = catTotals(cur, 'expense');
      if (!top.length) return `You haven’t recorded any expenses for ${monthLabel(mk)} yet. Add what you spend and I’ll break it down here.`;
      const lines = top.slice(0, 5).map(([c, v]) => `- **${c}**: ${money(v)} (${pct(v / exp)})`).join('\n');
      const [c1, v1] = top[0];
      return `So far in ${monthLabel(mk)} you’ve spent **${money(exp)}**. Here’s where it went:\n${lines}\n\n**${c1}** is your biggest category at ${pct(v1 / exp)} of spending.${exampleNote(S)}`;
    },
  },
  {
    id: 'compare', topic: 'Your money', q: 'How does this month compare to last month?',
    keys: ['compare', 'last month', 'previous month', 'vs', 'versus', 'more than last', 'trend', 'better or worse'],
    follow: ['where', 'pace', 'budget'],
    answer: S => {
      const day = new Date().getDate(), mk = nowKey(), pk = shiftMonth(mk, -1);
      const cur = monthTx(S, mk), prev = monthTx(S, pk).filter(t => +t.date.slice(8, 10) <= day);
      if (!cur.length && !prev.length) return noData;
      const ce = sum(cur, 'expense'), pe = sum(prev, 'expense');
      const diff = ce - pe, cm = catMap(cur, 'expense'), pm = catMap(prev, 'expense');
      const moves = Object.keys({ ...cm, ...pm }).map(c => [c, (cm[c] || 0) - (pm[c] || 0)] as [string, number]).filter(x => Math.abs(x[1]) >= 50000).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3);
      const head = pe === 0
        ? `You’ve spent **${money(ce)}** in the first ${day} days of ${monthLabel(mk, true)}. There’s nothing from the same days of ${monthLabel(pk, true)} to compare with.`
        : `Comparing the first **${day} days** of each month: you’ve spent **${money(ce)}** in ${monthLabel(mk, true)} against **${money(pe)}** in ${monthLabel(pk, true)}. That’s **${money(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'}** (${diff > 0 ? '+' : '−'}${pct(Math.abs(diff) / pe)}).`;
      const mv = moves.length ? '\n\nWhat changed most:\n' + moves.map(([c, d]) => `- **${c}**: ${d > 0 ? 'up' : 'down'} ${money(Math.abs(d))}`).join('\n') : '';
      return head + mv + (diff > 0 && pe ? '\n\nNo panic: some bills land early in the month. Check again in a week.' : diff <= 0 && pe ? '\n\nNice, you’re spending less than last month at this point.' : '') + exampleNote(S);
    },
  },
  {
    id: 'biggest', topic: 'Your money', q: 'What was my biggest expense this month?',
    keys: ['biggest', 'largest', 'most expensive', 'highest expense', 'biggest expense', 'top expense'],
    follow: ['where', 'save'],
    answer: S => {
      const cur = monthTx(S, nowKey()).filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount);
      if (!cur.length) return `No expenses recorded for ${monthLabel(nowKey())} yet.`;
      const top = cur.slice(0, 3).map(t => `- **${money(t.amount)}**: ${t.note || t.sub || t.cat} (${t.cat}, ${accName(S, t.account)})`).join('\n');
      const fixed = cur[0].sub === 'Rent' || cur[0].sub === 'Utilities';
      return `Your three largest expenses this month:\n${top}\n\n${fixed ? 'The top one is a fixed bill, so the real room to cut is usually in the smaller, everyday spending.' : 'Big one-off purchases are fine when they’re planned. Worth asking if this one was.'}${exampleNote(S)}`;
    },
  },
  {
    id: 'budget', topic: 'Your money', q: 'Am I on track with my budget?',
    keys: ['budget', 'on track', 'over budget', 'limit', 'within budget', 'limits'],
    follow: ['pace', 'save', 'rule503020'],
    answer: S => {
      const spent = catMap(monthTx(S, nowKey()), 'expense');
      const set = Object.entries(S.budgets).filter(([, v]) => v > 0);
      if (!set.length) return 'You haven’t set any budget limits yet. Open **Daily → Budget** and give each category a monthly limit. Then I can tell you exactly where you stand.\n\nNot sure what numbers to use? Ask me about the **50/30/20 rule**.';
      const over = set.filter(([c, l]) => (spent[c] || 0) > l);
      const near = set.filter(([c, l]) => (spent[c] || 0) <= l && (spent[c] || 0) / l >= 0.85);
      const tb = set.reduce((a, [, v]) => a + v, 0), ts = set.reduce((a, [c]) => a + (spent[c] || 0), 0);
      const d = new Date(), dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), through = d.getDate() / dim;
      let s = `You’ve used **${money(ts)}** of your **${money(tb)}** budget (${pct(ts / tb)}), and the month is ${pct(through)} done.`;
      s += ts / tb > through + 0.1 ? ' You’re spending **faster than the calendar**.' : ' That pace looks **healthy**.';
      if (over.length) s += '\n\nOver the limit:\n' + over.map(([c, l]) => `- **${c}**: ${money((spent[c] || 0) - l)} over`).join('\n');
      if (near.length) s += '\n\nClose to the limit:\n' + near.map(([c, l]) => `- **${c}**: ${money(l - (spent[c] || 0))} left`).join('\n');
      if (!over.length && !near.length) s += '\n\nEvery category is comfortably within its limit.';
      return s + exampleNote(S);
    },
  },
  {
    id: 'pace', topic: 'Your money', q: 'How much can I spend per day for the rest of the month?',
    keys: ['per day', 'daily', 'each day', 'a day', 'rest of the month', 'left to spend', 'how much can i spend', 'daily limit'],
    follow: ['budget', 'save'],
    answer: S => {
      const cur = monthTx(S, nowKey()), spent = sum(cur, 'expense'), days = daysLeftInMonth();
      const tb = Object.values(S.budgets).reduce((a, b) => a + (b > 0 ? b : 0), 0);
      if (tb > 0) {
        const left = tb - spent;
        if (left <= 0) return `You’ve already used your full monthly budget of **${money(tb)}** (spent ${money(spent)}). For the remaining **${days} days**, try to stick to essentials only.`;
        return `You have **${money(left)}** left in your budget with **${days} days** to go (counting today).\n\nThat’s about **${money(Math.floor(left / days))} a day**.\n\nThis includes bills that haven’t landed yet, so keep a little back if rent or utilities are still due.${exampleNote(S)}`;
      }
      const a = avgMonthly(S);
      if (!a.income) return 'Set budget limits in **Daily → Budget**, or record your income, and I can work out a daily spending number for you.';
      const target = a.income * 0.8, left = target - spent;
      return `You haven’t set budgets, so I’ll aim for saving 20% of your usual income (**${money(a.income)}** a month).\n\nThat leaves **${money(Math.max(0, left))}** to spend over the next **${days} days**: about **${money(Math.max(0, Math.floor(left / days)))} a day**.${exampleNote(S)}`;
    },
  },
  {
    id: 'networth', topic: 'Your money', q: 'What is my net worth and when do I reach the next milestone?',
    keys: ['net worth', 'worth', 'milestone', 'total money', 'how rich', 'how much do i have', 'lakh', 'crore', 'goal'],
    follow: ['accounts', 'portfolio', 'save'],
    answer: S => {
      const nw = netWorth(S), cash = liquid(S), inv = invTotals(S).value, a = avgMonthly(S);
      if (!hasData(S) && !S.holdings.length && nw === 0) return 'Your net worth is everything you own: cash, account balances and investments. Set your opening balances in **Settings** and add your investments, and I’ll track it for you.';
      const nx = MILESTONES.find(m => nw < m[0]);
      let s = `Your net worth is **${money(nw)}**: ${money(cash)} in cash and accounts plus ${money(inv)} in investments.`;
      if (!nx) s += '\n\nYou’ve passed every milestone on Grow’s track, including **1 crore**. Impressive.';
      else {
        const m = monthsTo(nx[0], nw, a.saving);
        s += `\n\nNext milestone: **৳${nx[1]}**, which is ${money(nx[0] - nw)} away. At your recent saving pace (${money(Math.max(0, a.saving))}/month) and an assumed 7% yearly growth, you’d get there in **${when(m)}**.`;
        if (a.saving > 0) {
          const m2 = monthsTo(nx[0], nw, a.saving * 1.2);
          if (m !== null && m2 !== null && m - m2 >= 1) s += ` Save 20% more each month and that drops to ${when(m2)}.`;
        }
      }
      return s + '\n\n_That timeline is an estimate, not a promise. Real returns go up and down._' + exampleNote(S);
    },
  },
  {
    id: 'accounts', topic: 'Your money', q: 'How much do I have in each account?',
    keys: ['account', 'accounts', 'balance', 'balances', 'bkash', 'bank', 'cash in hand', 'wallet'],
    follow: ['emergency', 'networth'],
    answer: S => {
      const b = balances(S);
      const rows = S.accounts.map(a => `- **${a.name}**: ${money(b[a.id] || 0)}`).join('\n');
      const neg = S.accounts.filter(a => (b[a.id] || 0) < 0);
      return `Here are your balances right now:\n${rows}\n\nTotal: **${money(liquid(S))}**.${neg.length ? `\n\n${neg.map(a => a.name).join(', ')} shows a negative balance. Usually that means a missing income entry or an opening balance that isn’t set. Check **Settings → Opening balances**.` : ''}${exampleNote(S)}`;
    },
  },
  {
    id: 'afford', topic: 'Your money', q: 'Can I afford a ৳50,000 purchase?',
    keys: ['afford', 'can i buy', 'should i buy', 'purchase', 'buy a', 'phone', 'laptop', 'bike'],
    follow: ['emergency', 'save', 'loancheck'],
    answer: (S, raw) => {
      const amt = amountIn(raw) ?? 5000000;
      const a = avgMonthly(S), cash = liquid(S), buffer = a.expense * 3, spare = cash - buffer;
      if (!a.expense) return `To check whether ${money(amt)} is affordable I need a few months of spending. Add your entries and ask again. The rule I’ll use: buy it from savings only if you still keep about 3 months of expenses afterwards.`;
      let s = `Let’s check **${money(amt)}** against your numbers:\n- Cash and accounts: **${money(cash)}**\n- Safety cushion (3 months of spending): **${money(buffer)}**\n- Free to use: **${money(Math.max(0, spare))}**\n\n`;
      if (spare >= amt) s += `**Yes, you can pay cash.** You’d still have ${money(cash - amt)} left, which keeps your cushion intact.`;
      else if (a.saving > 0) { const m = Math.ceil((amt - Math.max(0, spare)) / a.saving); s += `**Not comfortably yet.** Buying now would eat into your safety cushion. At your saving pace of ${money(a.saving)}/month you could buy it in about **${m} month${m === 1 ? '' : 's'}** without touching it.`; }
      else s += '**I’d wait.** You’re not saving each month right now, so this would come straight out of your safety cushion.';
      return s + '\n\nIf you’re thinking of an EMI or card instalment instead, compare the total cost in the **Loan finder** first.' + exampleNote(S);
    },
  },

  /* ---------------- Saving ---------------- */
  {
    id: 'save', topic: 'Saving', q: 'How can I save more?',
    keys: ['save more', 'saving', 'save', 'cut', 'reduce', 'spend less', 'cut back', 'tips'],
    follow: ['rule503020', 'salaryday', 'pace'],
    answer: S => {
      const c = checkup(S), cur = catMap(monthTx(S, nowKey()), 'expense');
      if (!hasData(S)) return 'Three things work for almost everyone:\n- **Pay yourself first**: move savings out on salary day, before you spend.\n- **Track every taka** for one month. Most people find one surprise category.\n- **Set limits** on two or three flexible categories, like dining out and shopping.\n\nAdd your entries and I’ll point to your own best opportunity.';
      const flex = ['Food', 'Apparel', 'Social Life', 'Gift', 'Transport'].map(k => [k, cur[k] || 0] as [string, number]).sort((a, b) => b[1] - a[1]);
      const [fc, fv] = flex[0];
      let s = c.rate === null ? '' : `Your recent savings rate is **${pct(c.rate)}**${c.rate >= 0.2 ? ', which is already solid' : '. A good target is 20% or more'}.\n\n`;
      s += 'Where I’d start:\n';
      if (fv > 0) s += `- **${fc}** is your largest flexible category this month (${money(fv)}). Trimming it by 15% frees about **${money(Math.round(fv * 0.15))}** a month.\n`;
      const dining = monthTx(S, nowKey()).filter(t => t.sub === 'Dining out');
      if (dining.length >= 2) s += `- You ate out **${dining.length} times** this month. Swapping one of them for home cooking each week adds up.\n`;
      const ride = monthTx(S, nowKey()).filter(t => t.cat === 'Transport');
      if (ride.length >= 4) s += `- **${ride.length} transport trips** so far. Combining errands or a monthly pass might help.\n`;
      s += `- Set up an automatic transfer on salary day of **${money(Math.round(Math.max(c.a.income * 0.2, 0) / 10000) * 10000)}** (20% of your usual income) into a separate account.`;
      return s + exampleNote(S);
    },
  },
  {
    id: 'rate', topic: 'Saving', q: 'What is my savings rate?',
    keys: ['savings rate', 'saving rate', 'how much do i save', 'percent saved', 'what percent'],
    follow: ['save', 'rule503020'],
    answer: S => {
      const a = avgMonthly(S);
      if (!a.income) return 'Your savings rate is the share of income you keep: (income − spending) ÷ income. Add your income and expenses and I’ll calculate yours.';
      const r = (a.income - a.expense) / a.income;
      const verdict = r >= 0.3 ? 'excellent' : r >= 0.2 ? 'healthy' : r >= 0.1 ? 'a decent start' : r >= 0 ? 'on the low side' : 'negative, meaning you spend more than you earn';
      return `Over your last ${Math.max(1, a.months)} full month${a.months === 1 ? '' : 's'} you earned about **${money(a.income)}** and spent **${money(a.expense)}** a month.\n\nThat’s a savings rate of **${pct(r)}**, which is ${verdict}.\n\n- 10%: building the habit\n- 20%: the common target\n- 30%+: fast track to financial freedom${exampleNote(S)}`;
    },
  },
  {
    id: 'emergency', topic: 'Saving', q: 'Do I have enough emergency savings?',
    keys: ['emergency', 'emergency fund', 'safety', 'rainy day', 'cushion', 'job loss', 'buffer'],
    follow: ['save', 'fdr'],
    answer: S => {
      const c = checkup(S);
      if (c.em === null) return 'An emergency fund is money set aside for surprises such as a medical bill, a job gap or a repair. The usual target is **3 to 6 months of spending**, kept somewhere safe and easy to reach. Record a few months of spending and I’ll tell you how close you are.';
      const target = c.a.expense * 6, cash = liquid(S);
      let s = `Your cash and accounts (**${money(cash)}**) cover about **${c.em.toFixed(1)} months** of your usual spending (${money(c.a.expense)}/month).\n\n`;
      s += c.em >= 6 ? '**You’re well covered.** Money beyond 6 months could be working harder in investments. Ask me how to invest your savings.'
        : c.em >= 3 ? `**You’re in the safe zone.** Building up to 6 months (${money(target)}) would make you even more resilient.`
          : `**This is the first thing to build.** Aim for at least 3 months (${money(c.a.expense * 3)}) before investing in anything risky.`;
      return s + '\n\nKeep it somewhere you can reach within a day or two, like a savings account or a short fixed deposit, not in stocks.' + exampleNote(S);
    },
  },
  {
    id: 'rule503020', topic: 'Saving', q: 'What is the 50/30/20 rule?',
    keys: ['50/30/20', '50 30 20', 'rule', 'how to budget', 'budgeting', 'make a budget', 'split my income'],
    follow: ['budget', 'save'],
    answer: S => {
      const a = avgMonthly(S);
      let s = 'It’s a simple way to split your income after tax:\n- **50% needs**: rent, utilities, groceries, transport\n- **30% wants**: dining out, shopping, outings\n- **20% savings**: emergency fund, investments, paying off debt';
      if (a.income > 0) s += `\n\nWith your usual income of **${money(a.income)}**, that’s about **${money(a.income * 0.5)}** for needs, **${money(a.income * 0.3)}** for wants and **${money(a.income * 0.2)}** to save.`;
      return s + '\n\nIn cities like Dhaka rent alone can take a big share, so 60/20/20 is a fair adjustment. The key is that the savings part comes first.';
    },
  },
  {
    id: 'salaryday', topic: 'Saving', q: 'What should I do on salary day?',
    keys: ['salary day', 'payday', 'got paid', 'salary', 'when i get paid', 'pay yourself'],
    follow: ['save', 'dps', 'emergency'],
    answer: S => {
      const a = avgMonthly(S), sv = Math.round(a.income * 0.2 / 10000) * 10000;
      return `A five-minute salary-day routine:\n1. **Move savings first**${sv ? `: about **${money(sv)}**` : ''} into a separate account or DPS. What you don’t see, you don’t spend.\n2. **Pay fixed bills** right away: rent, utilities, any EMI.\n3. **Move spending money** for the month to bKash or cash.\n4. **Check last month** in Grow: one category to improve.\n\nDo this for three months and saving becomes automatic.`;
    },
  },

  /* ---------------- Investing ---------------- */
  {
    id: 'portfolio', topic: 'Investing', q: 'How is my portfolio doing?',
    keys: ['portfolio', 'investments', 'holdings', 'returns', 'profit', 'gain', 'how are my investments'],
    follow: ['invest', 'mfstocks'],
    answer: S => {
      if (!S.holdings.length) return 'You haven’t added any investments yet. Go to **Home → Investments → + Add** and enter what you put in and what it’s worth today. I’ll track gains and your mix from there.';
      const t = invTotals(S);
      const rows = S.holdings.slice().sort((a, b) => b.value - a.value).map(h => { const g = h.invested ? (h.value - h.invested) / h.invested : 0; return `- **${h.name}**: ${money(h.value)} (${g >= 0 ? '+' : ''}${(g * 100).toFixed(1)}%)`; }).join('\n');
      const best = S.holdings.filter(h => h.invested).sort((a, b) => (b.value / b.invested) - (a.value / a.invested))[0];
      return `Your investments are worth **${money(t.value)}** against **${money(t.invested)}** put in, a total ${t.gain >= 0 ? 'gain' : 'loss'} of **${money(Math.abs(t.gain))}** (${t.gain >= 0 ? '+' : ''}${t.pct.toFixed(1)}%).\n\n${rows}${best ? `\n\nStrongest performer: **${best.name}**.` : ''}\n\nRemember: these are values you entered, so update them now and then to keep this accurate.${exampleNote(S)}`;
    },
  },
  {
    id: 'invest', topic: 'Investing', q: 'How should I invest my savings?',
    keys: ['invest', 'investing', 'where to invest', 'start investing', 'grow my money', 'beginner', 'best investment'],
    follow: ['sanchay', 'mfstocks', 'emergency'], tool: 'invest',
    answer: S => {
      const al = allocation(S), tot = Object.values(al).reduce((a, b) => a + b, 0), c = checkup(S);
      let s = 'A simple order that works for most people:\n1. **Emergency fund first**: 3–6 months of spending in safe, easy-to-reach places.\n2. **Pay off expensive debt**: card balances cost more than most investments earn.\n3. **Safe, steady returns**: savings certificates, fixed deposits, treasury bonds.\n4. **Growth, long term**: mutual funds and DSE stocks, only with money you won’t need for 5+ years.';
      if (tot > 0) s += '\n\nYour money today:\n' + Object.entries(al).filter(e => e[1] > 0).map(([k, v]) => `- **${k}**: ${pct(v / tot)}`).join('\n');
      if (c.em !== null && c.em < 3) s += '\n\nYour emergency cushion is under 3 months, so I’d build that up first.';
      return s + `\n\nOpen the **Invest planner** below to compare your mix with a target. ${CHECK}`;
    },
  },
  {
    id: 'sanchay', topic: 'Investing', q: 'What are savings certificates (Sanchayapatra)?',
    keys: ['sanchayapatra', 'sanchaypatra', 'savings certificate', 'savings certificates', 'national savings', 'government savings'],
    follow: ['fdr', 'invest', 'tax'],
    answer: () => `**Savings certificates (Sanchayapatra)** are government-backed savings schemes in Bangladesh, sold through banks and post offices.\n\n- **Very safe**: backed by the government\n- **Fixed return**, usually paid as monthly or periodic profit\n- **Lock-in**: typically 3–5 years; cashing early pays less\n- **Rules apply**: purchase limits per person, a TIN may be needed above a certain amount, and tax is deducted at source\n\nGood for: steady income and money you won’t need for a few years.\n\n${CHECK} Rates are set by the government and revised from time to time.`,
  },
  {
    id: 'fdr', topic: 'Investing', q: 'How do fixed deposits (FDR) work?',
    keys: ['fixed deposit', 'fdr', 'fd', 'term deposit', 'bank deposit', 'interest rate'],
    follow: ['dps', 'sanchay', 'inflation'],
    answer: () => `A **fixed deposit (FDR)** means you leave a lump sum with a bank for a set period (3 months to a few years) at an agreed interest rate.\n\n- **Low risk**, especially at large, stable banks\n- **Interest is taxed** at source, and the bank may charge excise duty on larger balances\n- **Breaking early** usually means lower interest\n\n**Compare by after-tax return**, not the headline rate. A deposit that pays less than inflation is quietly losing value.\n\n${CHECK}`,
  },
  {
    id: 'dps', topic: 'Investing', q: 'What is a DPS and is it worth it?',
    keys: ['dps', 'deposit pension', 'monthly deposit', 'monthly savings scheme', 'recurring deposit'],
    follow: ['fdr', 'salaryday', 'save'],
    answer: S => {
      const a = avgMonthly(S), sv = Math.round(a.income * 0.1 / 50000) * 50000;
      return `A **DPS (Deposit Pension Scheme)** is a monthly savings plan: you deposit a fixed amount every month for 3–10 years and get the total back with interest at the end.\n\n**Why people like it:** it forces the habit. The money leaves your account automatically.\n\n**Watch out for:**\n- Penalties or lower interest if you stop early\n- Missed payments may carry charges\n- Rates are often lower than an FDR\n\n${sv ? `A starting idea: a DPS of about **${money(sv)}**/month (roughly 10% of your income), plus separate emergency savings.\n\n` : ''}${CHECK}`;
    },
  },
  {
    id: 'mfstocks', topic: 'Investing', q: 'Mutual funds or stocks: which is better for me?',
    keys: ['mutual fund', 'mutual funds', 'stocks', 'shares', 'dse', 'stock market', 'share market', 'equity'],
    follow: ['dse', 'invest', 'portfolio'],
    answer: () => `Both own pieces of companies. The difference is **who picks** and **how much you spread out**.\n\n**Mutual funds**\n- A manager picks a basket of stocks or bonds for you\n- Instantly spread across many companies\n- You pay a yearly management fee\n- Better if you don’t want to research companies\n\n**Individual stocks (DSE/CSE)**\n- You choose each company yourself\n- Higher potential gains and losses\n- Needs time, research and steady nerves\n\nFor most beginners: **start with funds**, and only add individual stocks with money you can leave alone for 5+ years.\n\n_General education, not a recommendation for any specific fund or share._`,
  },
  {
    id: 'dse', topic: 'Investing', q: 'How do I start investing in DSE stocks?',
    keys: ['bo account', 'bo', 'beneficiary owner', 'open a bo', 'how to buy shares', 'broker', 'brokerage', 'dhaka stock', 'open account', 'cdbl', 'dse'],
    follow: ['mfstocks', 'invest'],
    answer: () => `Getting started on the Dhaka Stock Exchange:\n1. **Pick a licensed broker** (a TREC holder). Compare their fees, app and service.\n2. **Open a BO account** (Beneficiary Owner) with them. You’ll need your NID, photos, a bank account and a nominee.\n3. **Deposit money** into your trading account.\n4. **Start small**: a few well-known, profitable companies, or a fund.\n\nGood habits:\n- Never invest borrowed money or your emergency fund\n- Ignore tips from social media and “sure shot” groups\n- Plan to hold for years, not days\n\n_Check broker charges and BSEC rules before you open an account._`,
  },
  {
    id: 'gold', topic: 'Investing', q: 'Is gold a good investment?',
    keys: ['gold', 'jewellery', 'jewelry', 'bullion', 'sona'],
    follow: ['invest', 'inflation'],
    answer: S => {
      const g = S.holdings.filter(h => h.type === 'Gold').reduce((a, h) => a + h.value, 0), tot = Object.values(allocation(S)).reduce((a, b) => a + b, 0);
      return `Gold is a **store of value**. It tends to hold up when currencies or markets struggle, but it pays no interest or dividends.\n\n- **Jewellery** carries making charges you won’t get back when selling\n- **Bars or coins** are closer to the pure gold price\n- Prices can swing a lot over months\n\nMany planners suggest keeping gold to around **5–10%** of your investments.${g && tot ? ` Yours is currently **${pct(g / tot)}** of your total.` : ''}${exampleNote(S)}`;
    },
  },
  {
    id: 'crypto', topic: 'Investing', q: 'Should I invest in crypto?',
    keys: ['crypto', 'bitcoin', 'btc', 'ethereum', 'binance', 'usdt', 'coin'],
    follow: ['invest', 'mfstocks'],
    answer: () => `Be very careful here.\n\n- **Legal risk**: Bangladesh Bank has repeatedly warned the public against crypto trading, and it is not recognised as legal tender. Check the current legal position before doing anything.\n- **Price risk**: values can fall 50%+ in weeks.\n- **Scam risk**: many “investment” groups and apps are fraud.\n\nIf you still choose to, only use money you could lose completely without hurting your life or goals.`,
  },
  {
    id: 'inflation', topic: 'Basics', q: 'Why does inflation matter for my savings?',
    keys: ['inflation', 'prices rising', 'value of money', 'purchasing power', 'losing value'],
    follow: ['fdr', 'compound', 'invest'],
    answer: () => `**Inflation** is how fast prices rise. If prices go up 9% in a year, ৳1,00,000 buys what ৳91,700 bought last year.\n\nSo:\n- Cash under the mattress **loses value every year**\n- A deposit paying less than inflation is **shrinking in real terms**\n- To grow wealth, your money needs to earn **more than inflation** after tax\n\nThat’s why a mix of safe savings (for stability) and long-term investments (for growth) usually beats keeping everything in cash.`,
  },
  {
    id: 'compound', topic: 'Basics', q: 'How does compound growth work?',
    keys: ['compound', 'compounding', 'interest on interest', 'grow over time', 'long term'],
    follow: ['networth', 'invest'],
    answer: S => {
      const a = avgMonthly(S), m = Math.max(500000, Math.round(Math.max(0, a.saving) / 100000) * 100000 || 1000000);
      const fv = (yrs: number) => { let v = 0; for (let i = 0; i < yrs * 12; i++) v = v * (1 + 0.08 / 12) + m; return v; };
      return `Compounding means your returns earn returns of their own. It’s slow at first, then speeds up.\n\nSaving **${money(m)} a month** at an assumed 8% a year:\n- After 5 years: **${money(fv(5))}** (you put in ${money(m * 60)})\n- After 10 years: **${money(fv(10))}** (you put in ${money(m * 120)})\n- After 20 years: **${money(fv(20))}** (you put in ${money(m * 240)})\n\nThe biggest factor isn’t the rate. It’s **starting early** and **not stopping**.\n\n_Illustration only; real returns vary._`;
    },
  },
  {
    id: 'tax', topic: 'Basics', q: 'Do I need to file an income tax return?',
    keys: ['tax', 'income tax', 'return', 'tin', 'nbr', 'tax rebate', 'file tax'],
    follow: ['sanchay', 'invest'],
    answer: () => `In Bangladesh, you generally need to file a return if your income is above the tax-free threshold, or if you need to show proof of return (PSR) for things like a loan, credit card, trade licence or larger savings certificates.\n\n- Get a **TIN** online from the NBR\n- File by the yearly deadline (usually 30 November)\n- Certain investments, such as savings certificates, DPS, approved funds and life insurance, can reduce your tax through the **investment rebate**\n\nThresholds and rules change each budget, so check the **NBR** website or ask a tax adviser for the current year.`,
  },

  /* ---------------- Loans & cards ---------------- */
  {
    id: 'loancheck', topic: 'Loans & cards', q: 'What should I check before taking a loan?',
    keys: ['loan', 'borrow', 'personal loan', 'home loan', 'car loan', 'take a loan', 'lender'],
    follow: ['emi', 'debt', 'afford'], tool: 'loan',
    answer: S => {
      const a = avgMonthly(S);
      return `Before you sign, check:\n- **Total cost**: interest plus processing fee plus any insurance, over the full term\n- **Fixed or floating rate**: floating can rise later\n- **Early repayment fee**: can you close it early without a big penalty?\n- **Monthly payment vs income**: keep all EMIs under about **40%** of income${a.income ? ` (for you, roughly **${money(a.income * 0.4)}**/month)` : ''}\n- **Do you really need it?** Loans make sense for assets and emergencies, less so for lifestyle spending.\n\nUse the **Loan finder** below to compare up to three offers side by side. ${CHECK}`;
    },
  },
  {
    id: 'emi', topic: 'Loans & cards', q: 'How is a loan EMI calculated?',
    keys: ['emi', 'instalment', 'installment', 'monthly payment', 'calculate loan'],
    follow: ['loancheck', 'debt'], tool: 'loan',
    answer: S => {
      const a = avgMonthly(S), p = 500000, m = emi(p, 12, 3), tot = m * 36;
      return `EMI (equated monthly instalment) is a fixed monthly payment that covers interest and part of the loan each month.\n\nExample: **৳5,00,000 at 12% for 3 years**\n- Monthly EMI: **${moneyT(m)}**\n- Total paid: **${moneyT(tot)}**\n- Interest cost: **${moneyT(tot - p)}**\n\n${a.income ? `That EMI would be about **${pct(m * 100 / a.income)}** of your usual monthly income.\n\n` : ''}A longer term lowers the EMI but **raises the total interest**. Try it with your own numbers in the **Loan finder**.`;
    },
  },
  {
    id: 'debt', topic: 'Loans & cards', q: 'How do I pay off debt faster?',
    keys: ['debt', 'pay off', 'payoff', 'owe', 'repay', 'get out of debt', 'clear loan'],
    follow: ['card', 'loancheck', 'save'],
    answer: () => `Two proven methods:\n\n**Avalanche** (saves the most money)\n- Pay the minimum on everything\n- Put every extra taka on the **highest interest** debt first, usually credit cards\n\n**Snowball** (best for motivation)\n- Clear the **smallest balance** first for a quick win, then roll that payment into the next\n\nAlso:\n- Never miss a payment: late fees and credit history damage add up\n- Ask your bank about moving card debt to a lower-rate loan\n- Avoid taking new debt while you’re clearing old`,
  },
  {
    id: 'card', topic: 'Loans & cards', q: 'How do credit cards work, and how do I avoid interest?',
    keys: ['credit card', 'card', 'interest free', 'minimum payment', 'card bill', 'statement'],
    follow: ['cardpick', 'debt'], tool: 'card',
    answer: () => `A credit card lets you borrow up to a limit and repay later.\n\n- Pay the **full statement balance** by the due date and you usually pay **no interest** (the interest-free period is often up to about 45–50 days)\n- Pay only the **minimum** and interest is charged on the rest, often at a very high yearly rate\n- **Cash withdrawals** usually charge interest from day one, plus a fee\n\nGolden rule: treat the card like a debit card. Only spend what you already have, and pay it off in full every month.\n\nUse the **Card matcher** below to see whether a card’s rewards beat its fee for your spending.`,
  },
  {
    id: 'cardpick', topic: 'Loans & cards', q: 'Which credit card should I get?',
    keys: ['which card', 'best card', 'card rewards', 'cashback', 'annual fee', 'choose a card', 'lounge'],
    follow: ['card', 'debt'], tool: 'card',
    answer: S => {
      const cur = catTotals(monthTx(S, shiftMonth(nowKey(), -1)), 'expense')[0];
      const fit = !cur ? 'simple cashback' : cur[0] === 'Food' ? 'dining and grocery discounts' : cur[0] === 'Transport' ? 'fuel and ride-sharing rewards' : cur[0] === 'Household' ? 'a no-fee card with bill-pay rewards' : 'simple cashback';
      return `The best card is the one whose **rewards beat its fees on your actual spending**.\n\n${cur ? `Last month your biggest category was **${cur[0]}**, so look for **${fit}**.\n\n` : ''}Check:\n- **Annual fee**, and whether it’s waived above a spend target\n- **Reward rate** in your top categories\n- **Interest rate and late fees**, in case you ever carry a balance\n- **Partner discounts** you’d actually use\n\nOpen the **Card matcher** to compare two cards on your numbers. ${CHECK}`;
    },
  },

  /* ---------------- App help ---------------- */
  {
    id: 'howadd', topic: 'Basics', q: 'How do I add an entry quickly?',
    keys: ['add entry', 'log', 'record', 'add expense', 'add income', 'how to add', 'enter'],
    follow: ['where', 'budget'],
    answer: () => `Two ways:\n- Tap **+** anywhere and fill in the form\n- Or just tell me here, in plain words:\n  - “spent 450 on lunch”\n  - “paid 3200 electricity bill”\n  - “received 7500 freelance”\n\nI’ll fill in the category and account, and you confirm with one tap.`,
  },
];

const BY_ID = Object.fromEntries(E.map(e => [e.id, e]));
export const questionFor = (id: string) => BY_ID[id]?.q ?? '';
export const entriesByTopic = (t: Topic) => E.filter(e => e.topic === t);
export const STARTERS = ['where', 'save', 'budget', 'invest'];

/* ---------------- matching ---------------- */
const norm = (s: string) => ' ' + s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9/\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const stem = (w: string) => w.replace(/(ings|ing|ed|es|s)$/, '');
const STOP = new Set(['what', 'when', 'which', 'does', 'with', 'should', 'have', 'much', 'this', 'that', 'from', 'your', 'there', 'about', 'could', 'would', 'will', 'into', 'more', 'than', 'many']);
function score(e: Entry, text: string, words: Set<string>) {
  let s = 0; const hit = new Set<string>();
  for (const k of e.keys) {
    const nk = norm(k);
    if (k.includes(' ')) { if (text.includes(nk)) s += 3; }
    else { const st = stem(k.toLowerCase()); if (words.has(st) && !hit.has(st)) { hit.add(st); s += 1.4; } }
  }
  const qw = new Set(norm(e.q).trim().split(' ').filter(w => w.length > 3 && !STOP.has(w)).map(stem));
  qw.forEach(w => { if (words.has(w) && !hit.has(w)) s += 0.5; });
  return s;
}
function rank(raw: string) {
  const text = norm(raw), words = new Set(text.trim().split(' ').map(stem));
  return E.map(e => ({ e, s: score(e, text, words) })).sort((a, b) => b.s - a.s);
}

/* ---------------- quick add ---------------- */
export interface Quick { type: TxType; amount: number; cat: string; sub: string; note: string; account: string }
const KW: [RegExp, string, string][] = [
  [/rent/i, 'Household', 'Rent'], [/electric|gas bill|wifi|internet|utility|bill/i, 'Household', 'Utilities'],
  [/bazar|bazaar|grocer|vegetable|fish|rice|meat/i, 'Food', 'Groceries'], [/lunch|dinner|breakfast|restaurant|cafe|biryani|meal|food/i, 'Food', 'Dining out'],
  [/tea|coffee|snack/i, 'Food', 'Snacks'], [/rickshaw|cng|bus|metro|train/i, 'Transport', 'Rickshaw / CNG'],
  [/uber|pathao|ride/i, 'Transport', 'Ride share'], [/fuel|petrol|octane|diesel/i, 'Transport', 'Fuel'],
  [/medicine|pharmacy|doctor|hospital/i, 'Health', 'Medicine'], [/gym|fitness/i, 'Health', 'Fitness'],
  [/shirt|cloth|dress|shoes|panjabi|saree/i, 'Apparel', 'Clothes'], [/book|course|tuition|school/i, 'Education', 'Books'],
  [/gift|present/i, 'Gift', 'Gifts'], [/donat|charity/i, 'Gift', 'Donations'], [/friends|party|hangout|movie/i, 'Social Life', 'Friends'],
];
export function parseQuick(S: State, t: string): Quick | null {
  if (t.length > 100 || /\?|^(how|what|why|where|should|can|is|are|do|does)\b/i.test(t.trim())) return null;
  const m = t.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/); if (!m) return null;
  const amount = Math.round(parseFloat(m[1]) * 100); if (!(amount > 0)) return null;
  const isInc = /\b(earned|received|got paid|salary|income|bonus|freelance)\b/i.test(t);
  const isExp = /\b(spent|spend|paid|bought|buy|expense|purchased)\b/i.test(t);
  if (!isInc && !isExp) return null;
  const type: TxType = isInc ? 'income' : 'expense'; let cat = 'Other', sub = 'Other';
  if (isInc) { if (/salary/i.test(t)) { cat = 'Salary'; sub = 'Monthly salary'; } else if (/freelance|project/i.test(t)) { cat = 'Freelance'; sub = 'Project'; } else if (/bonus/i.test(t)) { cat = 'Salary'; sub = 'Bonus'; } }
  else for (const [re, c, s] of KW) if (re.test(t)) { cat = c; sub = s; break; }
  const accFrom = (id: string) => (S.accounts.find(a => a.id === id) || S.accounts[0])?.id ?? 'cash';
  let account = accFrom(isInc ? 'bank' : 'cash');
  if (/bkash/i.test(t)) account = accFrom('bkash'); else if (/bank|card/i.test(t)) account = accFrom('bank'); else if (/cash/i.test(t)) account = accFrom('cash');
  const note = t.trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!CATS[type][cat]) { cat = 'Other'; sub = 'Other'; }
  return { type, amount, cat, sub, note: note.charAt(0).toUpperCase() + note.slice(1), account };
}

/* ---------------- "how much did I spend on X" ---------------- */
function categorySpend(S: State, text: string): Reply | null {
  if (!/\b(spend|spent|spending|cost|paid|pay)\b/i.test(text) || /\b(save|invest|loan|card|afford|per day|daily)\b/i.test(text)) return null;
  let cat: string | null = null, sub: string | null = null;
  for (const c of Object.keys(CATS.expense)) if (new RegExp('\\b' + c.split(' ')[0] + '\\b', 'i').test(text)) { cat = c; break; }
  if (!cat) for (const [re, c, s2] of KW) if (re.test(text)) { cat = c; sub = s2; break; }
  if (!cat || cat === 'Other') return null;
  const mk = nowKey(), pk = shiftMonth(mk, -1);
  const pickT = (mkey: string) => monthTx(S, mkey).filter(t => t.type === 'expense' && t.cat === cat && (!sub || t.sub === sub));
  const cur = pickT(mk), prev = pickT(pk), label = sub && sub !== cat ? `${sub.toLowerCase()}` : cat.toLowerCase();
  const c = cur.reduce((a, t) => a + t.amount, 0), p = prev.reduce((a, t) => a + t.amount, 0);
  if (!c && !p) return { text: `I can’t find any **${label}** spending this month or last month. If you’ve spent on it, add the entries and ask again.`, follow: ['where', 'budget'] };
  const all = sum(monthTx(S, mk), 'expense'), lim = !sub ? S.budgets[cat] || 0 : 0;
  let t = `You’ve spent **${money(c)}** on ${label} so far in ${monthLabel(mk)}` + (cur.length ? ` across **${cur.length}** entr${cur.length === 1 ? 'y' : 'ies'}` : '') + (all && c ? `, which is ${pct(c / all)} of all spending.` : '.');
  if (p) t += ` Last month the total was **${money(p)}**.`;
  if (lim) t += c > lim ? `\n\nThat’s **${money(c - lim)} over** your ${cat} budget of ${money(lim)}.` : `\n\nYou have **${money(lim - c)}** left of your ${money(lim)} ${cat} budget.`;
  const top = cur.slice().sort((a, b) => b.amount - a.amount).slice(0, 3);
  if (top.length > 1) t += '\n\nLargest this month:\n' + top.map(x => `- ${money(x.amount)}: ${x.note || x.sub}`).join('\n');
  return { text: t + exampleNote(S), follow: ['budget', 'save', 'compare'] };
}

/* ---------------- main entry ---------------- */
export function answer(S: State, raw: string, forcedId?: string): Reply {
  const text = raw.trim();
  if (forcedId && BY_ID[forcedId]) { const e = BY_ID[forcedId]; return { text: e.answer(S, text), follow: e.follow, tool: e.tool, topicId: e.id }; }
  if (/^(hi|hey|hello|salam|assalamu|good (morning|evening|afternoon))\b/i.test(text))
    return { text: `Hello! I’m here to help with your money: spending, saving, budgets, investing, loans and cards.${hasData(S) ? ` Quick look: you’ve spent **${money(sum(monthTx(S, nowKey()), 'expense'))}** so far this month.` : ''}\n\nWhat would you like to know?`, follow: STARTERS };
  if (/^(thanks|thank you|thx|ok|okay|great|cool|nice)\b/i.test(text))
    return { text: 'Anytime. Anything else you’d like to look at?', follow: ['compare', 'networth', 'pace'] };
  if (/what can you do|help me|^help$|who are you|what are you/i.test(text))
    return { text: 'I’m your money guide. I read the numbers in Grow and answer common money questions with them. Try:\n- **Your money**: spending breakdowns, budget check, daily allowance, net worth\n- **Saving**: savings rate, emergency fund, salary-day plan\n- **Investing**: savings certificates, FDR, DPS, funds, DSE stocks\n- **Loans & cards**: EMI, comparing offers, avoiding card interest\n\nYou can also log entries by typing “spent 450 on lunch”.', follow: ['where', 'save', 'invest'] };
  const cs = categorySpend(S, text);
  if (cs) return cs;
  const r = rank(text);
  if (r[0].s >= 1.4) { const e = r[0].e; return { text: e.answer(S, text), follow: e.follow, tool: e.tool, topicId: e.id }; }
  const close = r.filter(x => x.s >= 0.9).slice(0, 3).map(x => x.e.id);
  return {
    text: close.length ? 'I’m not completely sure what you mean. Is it one of these?' : 'I don’t have a good answer for that one yet. I’m best with everyday money questions about your spending, saving, investing, loans and cards. Here are a few to try:',
    follow: close.length ? close : ['where', 'save', 'invest', 'loancheck'],
  };
}
