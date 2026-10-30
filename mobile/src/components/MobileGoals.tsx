import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration, formatCompactDuration, getCategoryColor } from '../lib/utils';
import { evaluatePace, getCurrentWeekTimeProgress } from '../lib/paceUtils';
import type { BudgetType, ProjectGoal } from '../types';
import {
  Target,
  Plus,
  Play,
  Square,
  Edit3,
  Trash2,
  Archive,
  ArchiveRestore,
  Compass,
  X,
  Palette,
  Check,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { triggerHapticFeedback, registerBackHandler } from '../services/nativeBridge';
import { useSheetSwipeToClose } from '../lib/useSheetSwipeToClose';
import { FocusDurationModal } from './FocusDurationModal';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

export const MobileGoals: React.FC = () => {
  const {
    categoryBudgets,
    projectGoals,
    updateCategoryBudget,
    addProjectGoal,
    updateProjectGoal,
    deleteProjectGoal,
    toggleArchiveProject,
    getProjectDurationMinutes,
    getCategorySpentMinutes,
    startRealtimeActivity,
    activeActivity,
    stopActiveActivity,
    setFocusTargetDuration,
  } = useTimeStore();

  const [activeTab, setActiveTab] = useState<'BUDGETS' | 'PROJECTS'>('BUDGETS');
  const [filterArchived, setFilterArchived] = useState(false);

  // 模态弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectGoal | null>(null);
  const [formError, setFormError] = useState('');

  // 专属专注时长设定弹窗状态
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [targetFocusProject, setTargetFocusProject] = useState<ProjectGoal | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    color: '#6366f1',
    category: '开发/技术',
    description: '',
    keywordsStr: '',
    targetHours: '10',
    period: 'WEEKLY' as 'WEEKLY' | 'TOTAL',
    budgetType: 'AT_LEAST' as BudgetType,
  });

  // 自然周时间流逝进度
  const now = new Date();
  const weekTimeProgress = useMemo(() => getCurrentWeekTimeProgress(now), [now]);
  const weekTimeProgressPercent = Math.round(weekTimeProgress * 100);

  // 过滤后的项目列表
  const displayedProjects = useMemo(() => {
    return projectGoals.filter((p) => (filterArchived ? p.isArchived : !p.isArchived));
  }, [projectGoals, filterArchived]);

  const activeProjectsCount = projectGoals.filter((p) => !p.isArchived).length;
  const archivedProjectsCount = projectGoals.filter((p) => p.isArchived).length;
  const enabledBudgetsCount = categoryBudgets.filter(
    (b) => b.isEnabled && b.weeklyTargetHours > 0
  ).length;

  const { backdropRef, sheetRef, scrollRef, closeWithAnimation } = useSheetSwipeToClose({
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false),
  });

  // 拦截物理与手势返回按键，关闭编辑/新建弹窗
  useEffect(() => {
    if (!isModalOpen) return;
    return registerBackHandler(() => {
      closeWithAnimation();
      return true;
    });
  }, [isModalOpen, closeWithAnimation]);

  const handleOpenAdd = () => {
    triggerHapticFeedback(20);
    setEditingProject(null);
    setFormData({
      name: '',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      category: '开发/技术',
      description: '',
      keywordsStr: '',
      targetHours: '10',
      period: 'WEEKLY',
      budgetType: 'AT_LEAST',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project: ProjectGoal) => {
    triggerHapticFeedback(20);
    setEditingProject(project);
    setFormData({
      name: project.name,
      color: project.color,
      category: project.category || '开发/技术',
      description: project.description || '',
      keywordsStr: project.keywords.join(', '),
      targetHours: project.targetHours.toString(),
      period: project.period,
      budgetType: project.budgetType,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('请输入目标项目名称');
      return;
    }

    const hours = parseFloat(formData.targetHours);
    if (isNaN(hours) || hours <= 0) {
      setFormError('请输入有效的目标小时数（必须大于0）');
      return;
    }

    const keywords = formData.keywordsStr
      .split(/[,，、\s]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    triggerHapticFeedback(30);

    if (editingProject) {
      updateProjectGoal(editingProject.id, {
        name: formData.name.trim(),
        color: formData.color,
        category: formData.name.trim(),
        description: formData.description.trim(),
        keywords,
        targetHours: hours,
        period: formData.period,
        budgetType: formData.budgetType,
      });
    } else {
      addProjectGoal({
        name: formData.name.trim(),
        color: formData.color,
        category: formData.name.trim(),
        description: formData.description.trim(),
        keywords,
        targetHours: hours,
        period: formData.period,
        budgetType: formData.budgetType,
      });
    }

    setIsModalOpen(false);
  };

  const handleSaveFocusDuration = (minutes: number | null) => {
    if (!targetFocusProject) return;
    const isCurrentActive =
      activeActivity &&
      (activeActivity.projectId === targetFocusProject.id ||
        activeActivity.title === targetFocusProject.name);

    if (isCurrentActive) {
      setFocusTargetDuration(minutes);
    } else {
      startRealtimeActivity(
        targetFocusProject.name,
        targetFocusProject.category || targetFocusProject.name,
        targetFocusProject.keywords,
        targetFocusProject.id,
        minutes || undefined
      );
    }
    setDurationModalOpen(false);
    setTargetFocusProject(null);
  };

  return (
    <div className="space-y-4">
      {/* 头部标题与顶层双 Tab 切换 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Target className="w-4 h-4 text-indigo-400 shrink-0" />
            <h3 className="text-xs font-semibold text-slate-300 tracking-wide whitespace-nowrap">
              目标计划与周预算
            </h3>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap shrink-0">
            {activeTab === 'BUDGETS'
              ? `${enabledBudgetsCount}/${categoryBudgets.length} 项已启用`
              : `${activeProjectsCount} 个活跃目标`}
          </span>
        </div>

        {/* 双维度切换药丸 */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-900/90 border border-white/[0.07] text-xs">
          <button
            onClick={() => {
              triggerHapticFeedback(15);
              setActiveTab('BUDGETS');
            }}
            className={`py-2 rounded-xl text-center font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'BUDGETS'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span>分类周时间预算</span>
          </button>
          <button
            onClick={() => {
              triggerHapticFeedback(15);
              setActiveTab('PROJECTS');
            }}
            className={`py-2 rounded-xl text-center font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'PROJECTS'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span>专属目标项目</span>
          </button>
        </div>
      </div>

      {/* 自然周时间流逝基准条 */}
      <div className="p-3.5 rounded-2xl chronos-hero-card space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-1.5 text-indigo-200 font-semibold whitespace-nowrap">
            <Compass className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>自然周时间流速基准</span>
          </div>
          <span className="font-mono tabular-nums font-bold text-indigo-300 whitespace-nowrap shrink-0">
            {weekTimeProgressPercent}%
            <span className="text-[10px] text-slate-400 font-normal ml-1">
              ({Math.round(168 * weekTimeProgress)}h/168h)
            </span>
          </span>
        </div>

        {/* 时间流逝主进度条 */}
        <div className="w-full h-2 bg-slate-900/90 border border-white/[0.06] rounded-full overflow-hidden relative">
          <div
            style={{ width: `${weekTimeProgressPercent}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all duration-700"
          />
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          所有达标型与克制型周预算均以本流速刻度为对标，自动评估超前、稳步或消耗过快。
        </p>
      </div>

      {/* ==================================================== */}
      {/* 视图一：全部分类每周时间预算面板（与存储分类100%对齐） */}
      {/* ==================================================== */}
      {activeTab === 'BUDGETS' && (
        <div className="space-y-3">
          {categoryBudgets.map((budget) => {
            const category = budget.category;
            const spentMinutes = getCategorySpentMinutes(category, 'WEEK');
            const targetHours = budget.weeklyTargetHours || 0;
            const pace = evaluatePace(spentMinutes, targetHours, budget.budgetType, now);
            const isEnabled = budget.isEnabled && targetHours > 0;
            const catColor = getCategoryColor(category);

            return (
              <div
                key={category}
                className={`rounded-2xl p-4 border transition-all space-y-3 ${
                  isEnabled
                    ? 'chronos-card border-white/[0.14]'
                    : 'bg-slate-900/45 border-white/[0.06] opacity-80'
                }`}
              >
                {/* 顶栏：分类名称、已投胶囊与开启开关（防挤压） */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                    <div className="flex items-center space-x-2 whitespace-nowrap">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: catColor }}
                      />
                      <h4 className="text-sm font-bold text-white">{category}</h4>
                    </div>
                    <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 leading-none rounded-md bg-slate-800/80 border border-white/[0.05] text-slate-300 whitespace-nowrap">
                      本周已投 {formatCompactDuration(spentMinutes)}
                    </span>
                  </div>

                  {/* 启用/关闭切换 */}
                  <button
                    onClick={() => {
                      triggerHapticFeedback(15);
                      updateCategoryBudget(category, {
                        isEnabled: !budget.isEnabled,
                        weeklyTargetHours:
                          budget.weeklyTargetHours || (budget.isEnabled ? 0 : 10),
                      });
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                      budget.isEnabled
                        ? 'bg-indigo-600/25 text-indigo-200 border border-indigo-400/40'
                        : 'bg-slate-800 text-slate-400 border border-white/[0.06]'
                    }`}
                  >
                    {budget.isEnabled ? '已开启' : '未开启'}
                  </button>
                </div>

                {/* 预算调整与推进面板 */}
                {budget.isEnabled ? (
                  <div className="space-y-2.5 pt-0.5">
                    {/* 调节栏：达标/克制切换与目标小时数步进器 */}
                    <div className="flex items-center justify-between gap-2 bg-slate-950/65 border border-white/[0.06] p-2 rounded-xl">
                      <button
                        onClick={() => {
                          triggerHapticFeedback(15);
                          updateCategoryBudget(category, {
                            budgetType:
                              budget.budgetType === 'AT_LEAST' ? 'AT_MOST' : 'AT_LEAST',
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap transition-all active:scale-95 ${
                          budget.budgetType === 'AT_LEAST'
                            ? 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/12 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {budget.budgetType === 'AT_LEAST' ? '≥ 达标投入型' : '≤ 上限克制型'}
                      </button>

                      {/* 目标小时数微调器 */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => {
                            triggerHapticFeedback(10);
                            const next = Math.max(1, (budget.weeklyTargetHours || 0) - 1);
                            updateCategoryBudget(category, { weeklyTargetHours: next });
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/[0.06] text-white font-bold text-sm flex items-center justify-center active:scale-95"
                        >
                          -
                        </button>
                        <span className="font-mono tabular-nums font-extrabold text-white text-xs px-1 min-w-[38px] text-center whitespace-nowrap">
                          {budget.weeklyTargetHours}h
                        </span>
                        <button
                          onClick={() => {
                            triggerHapticFeedback(10);
                            const next = Math.min(168, (budget.weeklyTargetHours || 0) + 1);
                            updateCategoryBudget(category, { weeklyTargetHours: next });
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/[0.06] text-white font-bold text-sm flex items-center justify-center active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 双层进度条 (实际投入 vs 周时间流速对标线) */}
                    <div className="space-y-1.5">
                      <div className="w-full h-3 bg-slate-950/80 border border-white/[0.06] rounded-full relative overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, pace.percent)}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            budget.budgetType === 'AT_LEAST'
                              ? pace.percent >= 100
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-indigo-500 to-violet-400'
                              : pace.percent > 100
                              ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                              : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                          }`}
                        />
                        {/* 自然周时间线刻度标志 */}
                        <div
                          style={{ left: `${weekTimeProgressPercent}%` }}
                          className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] z-10"
                          title={`当前周时间流速 ${weekTimeProgressPercent}%`}
                        />
                      </div>

                      {/* 进度百分比与步调健康度徽章 */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] text-slate-400 font-mono tabular-nums whitespace-nowrap">
                          达成 <strong className="text-white">{pace.percent}%</strong>
                          <span className="text-slate-500 ml-1.5">
                            · 流速 {weekTimeProgressPercent}%
                          </span>
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 leading-none rounded-md font-bold border whitespace-nowrap shrink-0 ${pace.badgeClass}`}
                        >
                          {pace.label}
                        </span>
                      </div>
                    </div>

                    {/* 推进评述 */}
                    <p className="text-[11px] text-slate-300/90 bg-slate-950/55 border border-white/[0.04] px-2.5 py-2 rounded-xl leading-relaxed">
                      {pace.description}
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    点击右上角「未开启」即可设定该分类的每周目标小时数与节奏预警。
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================== */}
      {/* 视图二：专属目标项目管理面板                          */}
      {/* ==================================================== */}
      {activeTab === 'PROJECTS' && (
        <div className="space-y-3">
          {/* 操作与过滤栏 */}
          <div className="flex items-center justify-between gap-2">
            {/* 活跃 / 归档 切换 */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900/90 border border-white/[0.07] text-xs">
              <button
                onClick={() => {
                  triggerHapticFeedback(15);
                  setFilterArchived(false);
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  !filterArchived ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                进行中 ({activeProjectsCount})
              </button>
              <button
                onClick={() => {
                  triggerHapticFeedback(15);
                  setFilterArchived(true);
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  filterArchived ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                已归档 ({archivedProjectsCount})
              </button>
            </div>

            {/* 新建项目按钮 */}
            <button
              onClick={handleOpenAdd}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center space-x-1 whitespace-nowrap shrink-0 shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>新建目标</span>
            </button>
          </div>

          {/* 项目卡片列表 */}
          {displayedProjects.length === 0 ? (
            <div className="py-12 text-center space-y-3 rounded-2xl chronos-card border-dashed p-6">
              <Target className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                {filterArchived
                  ? '暂无已归档的目标项目'
                  : '暂无专属目标项目，点击右上角「新建目标」开启长期追踪'}
              </p>
            </div>
          ) : (
            displayedProjects.map((project) => {
              const spentMinutes = getProjectDurationMinutes(project.id, project.period, now);
              const pace = evaluatePace(spentMinutes, project.targetHours, project.budgetType, now);
              const isCurrentActive =
                activeActivity &&
                (activeActivity.projectId === project.id || activeActivity.title === project.name);

              return (
                <div
                  key={project.id}
                  className="rounded-2xl p-4 chronos-card space-y-3 transition"
                  style={{ borderLeft: `4px solid ${project.color}` }}
                >
                  {/* 项目头部信息 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <h4 className="text-sm font-bold text-white truncate max-w-full">
                          {project.name}
                        </h4>
                        {project.category && project.category !== project.name && (
                          <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-slate-800 text-slate-300 whitespace-nowrap">
                            {project.category}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 leading-none rounded-md bg-indigo-500/15 text-indigo-300 font-mono tabular-nums whitespace-nowrap">
                          {project.period === 'WEEKLY' ? '周目标' : '累计目标'} {project.targetHours}h
                        </span>
                      </div>

                      {project.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {project.description}
                        </p>
                      )}
                    </div>

                    {/* 步调健康度徽章 */}
                    <span
                      className={`text-[10px] px-2 py-0.5 leading-none rounded-md font-bold border whitespace-nowrap shrink-0 ${pace.badgeClass}`}
                    >
                      {pace.label}
                    </span>
                  </div>

                  {/* 触发词徽章 */}
                  {project.keywords.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1">
                      {project.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-[10px] px-2 py-0.5 leading-none rounded-md bg-slate-800/80 text-slate-400 font-mono whitespace-nowrap"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 进度条 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                        已投入: <strong className="text-indigo-300">{formatDuration(spentMinutes)}</strong>
                      </span>
                      <span className="font-mono tabular-nums font-bold text-white text-xs">
                        {pace.percent}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(100, pace.percent)}%`,
                          backgroundColor: project.color,
                        }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* 底部操作快捷键 */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                      {isCurrentActive ? (
                        <>
                          <button
                            onClick={() => {
                              triggerHapticFeedback(20);
                              setTargetFocusProject(project);
                              setDurationModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-500/40 flex items-center space-x-1.5 whitespace-nowrap active:scale-95 transition shadow-sm shadow-emerald-500/15"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>
                              专注中 · {activeActivity.targetDurationMinutes ? `${activeActivity.targetDurationMinutes}m` : '自由'} (点此调时间)
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              triggerHapticFeedback(25);
                              stopActiveActivity();
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/35 flex items-center space-x-1 whitespace-nowrap active:scale-95 transition shrink-0"
                            title="结算当前专注"
                          >
                            <Square className="w-3 h-3 fill-rose-300 shrink-0" />
                            <span>结算</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            triggerHapticFeedback(20);
                            setTargetFocusProject(project);
                            setDurationModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 text-xs font-bold border border-indigo-500/35 flex items-center space-x-1.5 whitespace-nowrap active:scale-95 transition shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-indigo-300 shrink-0" />
                          <span>开启专注</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(project)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="编辑项目"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          triggerHapticFeedback(20);
                          toggleArchiveProject(project.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title={project.isArchived ? '解除归档' : '归档项目'}
                      >
                        {project.isArchived ? (
                          <ArchiveRestore className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`确定要彻底删除项目「${project.name}」吗？`)) {
                            triggerHapticFeedback(40);
                            deleteProjectGoal(project.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="删除项目"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 新建 / 编辑专属目标项目模态弹窗                      */}
      {/* ==================================================== */}
      {isModalOpen &&
        (() => {
          const modalNode = (
            <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
              <div
                ref={backdropRef}
                className="absolute inset-0 bg-slate-950/82 backdrop-blur-md"
                onClick={closeWithAnimation}
              />

              <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t border-x sm:border border-slate-700/80 shadow-2xl px-5 pt-2.5 flex flex-col max-h-[90vh] z-10 will-change-transform"
                style={{
                  paddingBottom: 'max(calc(var(--safe-bottom, 0px) + 0.875rem), 1.25rem)',
                }}
              >
                <div
                  data-sheet-drag-handle="true"
                  className="cursor-grab active:cursor-grabbing touch-none"
                >
                  <div className="pt-1 pb-2.5 flex flex-col items-center justify-center sm:hidden">
                    <div className="w-11 h-1.5 bg-slate-600/80 rounded-full" />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-indigo-400" />
                      <span>{editingProject ? '编辑专属目标项目' : '新建专属目标项目'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={closeWithAnimation}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                      aria-label="关闭专属目标弹窗"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto overscroll-contain pt-3 space-y-3.5 no-scrollbar"
                >
                  {formError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProject} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">项目名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：毕业论文、AI模型微调、英语考证"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">周期维度</label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="WEEKLY">自然周目标</option>
                    <option value="TOTAL">长期累计目标</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">目标类型</label>
                  <select
                    value={formData.budgetType}
                    onChange={(e) =>
                      setFormData({ ...formData, budgetType: e.target.value as BudgetType })
                    }
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="AT_LEAST">≥ 达标型 (力求达成)</option>
                    <option value="AT_MOST">≤ 克制型 (控制上限)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">目标小时数 (h) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={formData.targetHours}
                  onChange={(e) => setFormData({ ...formData, targetHours: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <span>主题配色</span>
                </label>
                <div className="flex items-center justify-between gap-1.5 px-2 py-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center shrink-0 ${
                        formData.color === c
                          ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-md'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      aria-label={`选择配色 ${c}`}
                    >
                      {formData.color === c && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">智能触发词 (逗号分隔)</label>
                <input
                  type="text"
                  placeholder="如：论文, 毕业, 答辩, 查重"
                  value={formData.keywordsStr}
                  onChange={(e) => setFormData({ ...formData, keywordsStr: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  随手记输入包含这些词语时，将自动关联至此目标项目。
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">目标愿景与备注 (选填)</label>
                <textarea
                  rows={2}
                  placeholder="写下此项目的核心意义或里程碑..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={closeWithAnimation}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition active:scale-95"
                      >
                        {editingProject ? '保存更新' : '立即创建'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          );
          return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
        })()}

      {/* 🎯 专属目标专属专注时长设定弹窗 */}
      <FocusDurationModal
        isOpen={durationModalOpen}
        onClose={() => {
          setDurationModalOpen(false);
          setTargetFocusProject(null);
        }}
        title={
          targetFocusProject
            ? activeActivity &&
              (activeActivity.projectId === targetFocusProject.id ||
                activeActivity.title === targetFocusProject.name)
              ? `调整「${targetFocusProject.name}」专注时长`
              : `开启「${targetFocusProject.name}」专属专注`
            : '设置专注提醒时长'
        }
        subtitle={
          targetFocusProject
            ? activeActivity &&
              (activeActivity.projectId === targetFocusProject.id ||
                activeActivity.title === targetFocusProject.name)
              ? '修改本次专注的目标时长，到期将自动响铃'
              : '手动指定本次专注提醒时长，到期将自动响铃并常驻通知栏'
            : undefined
        }
        confirmLabel={
          targetFocusProject &&
          activeActivity &&
          (activeActivity.projectId === targetFocusProject.id ||
            activeActivity.title === targetFocusProject.name)
            ? '更新时长'
            : '开启专注'
        }
        currentMinutes={
          targetFocusProject &&
          activeActivity &&
          (activeActivity.projectId === targetFocusProject.id ||
            activeActivity.title === targetFocusProject.name)
            ? activeActivity.targetDurationMinutes
            : 25
        }
        onSave={handleSaveFocusDuration}
      />
    </div>
  );
};
