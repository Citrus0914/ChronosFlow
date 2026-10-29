import React, { useState, useMemo, useEffect } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration, getCategoryColor } from '../lib/utils';
import { evaluatePace, getCurrentWeekTimeProgress } from '../lib/paceUtils';
import type { BudgetType, ProjectGoal } from '../types';
import {
  Target,
  Plus,
  Play,
  Edit3,
  Trash2,
  Archive,
  ArchiveRestore,
  Compass,
  X,
  Palette,
  AlertTriangle,
} from 'lucide-react';
import { triggerHapticFeedback, registerBackHandler } from '../services/nativeBridge';

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

const PRESET_CATEGORIES = ['开发/技术', '工作/业务', '学习/提升', '健康/运动', '休闲/生活'];

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
  } = useTimeStore();

  const [activeTab, setActiveTab] = useState<'BUDGETS' | 'PROJECTS'>('BUDGETS');
  const [filterArchived, setFilterArchived] = useState(false);

  // 模态弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectGoal | null>(null);
  const [formError, setFormError] = useState('');

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
  const enabledBudgetsCount = categoryBudgets.filter((b) => b.isEnabled && b.weeklyTargetHours > 0).length;

  // 拦截物理与手势返回按键，关闭编辑/新建弹窗
  useEffect(() => {
    if (!isModalOpen) return;
    return registerBackHandler(() => {
      triggerHapticFeedback(15);
      setIsModalOpen(false);
      return true;
    });
  }, [isModalOpen]);

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

  return (
    <div className="space-y-4">
      {/* 头部标题与顶层双 Tab 切换 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              目标计划与时间预算
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {activeTab === 'BUDGETS' ? `${enabledBudgetsCount}/5 预算已启用` : `${activeProjectsCount} 个活跃目标`}
          </span>
        </div>

        {/* 双维度切换药丸 */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => {
              triggerHapticFeedback(15);
              setActiveTab('BUDGETS');
            }}
            className={`py-1.5 rounded-lg text-center font-bold transition-all ${
              activeTab === 'BUDGETS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 分类每周时间预算
          </button>
          <button
            onClick={() => {
              triggerHapticFeedback(15);
              setActiveTab('PROJECTS');
            }}
            className={`py-1.5 rounded-lg text-center font-bold transition-all ${
              activeTab === 'PROJECTS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎯 专属目标项目
          </button>
        </div>
      </div>

      {/* 自然周时间流逝基准条 (自然周对标基准) */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/20 space-y-2 shadow-lg">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-indigo-300 font-medium">
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>本自然周时间流速基准</span>
          </div>
          <span className="font-mono font-bold text-indigo-400">
            {weekTimeProgressPercent}%
            <span className="text-[10px] text-slate-500 font-normal ml-1">
              (约 {Math.round(168 * weekTimeProgress)}h / 168h)
            </span>
          </span>
        </div>

        {/* 时间流逝主进度条 */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
          <div
            style={{ width: `${weekTimeProgressPercent}%` }}
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
          />
        </div>

        <p className="text-[10px] text-slate-400 leading-tight">
          💡 所有「达标型」与「克制型」周预算均以本流速线为对标，自动评估超前、稳步或透支健康度。
        </p>
      </div>

      {/* ==================================================== */}
      {/* 视图一：5 大分类每周时间预算面板                      */}
      {/* ==================================================== */}
      {activeTab === 'BUDGETS' && (
        <div className="space-y-3">
          {PRESET_CATEGORIES.map((category) => {
            const budget = categoryBudgets.find((b) => b.category === category) || {
              category,
              weeklyTargetHours: 0,
              budgetType: category === '休闲/生活' ? ('AT_MOST' as BudgetType) : ('AT_LEAST' as BudgetType),
              isEnabled: false,
            };

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
                    ? 'bg-slate-900/80 border-slate-700 shadow-md'
                    : 'bg-slate-900/40 border-slate-800/80 opacity-75'
                }`}
              >
                {/* 顶栏：分类名称与开启开关 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: catColor }}
                    />
                    <h4 className="text-sm font-bold text-white">{category}</h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      本周已投: {formatDuration(spentMinutes)}
                    </span>
                  </div>

                  {/* 启用/关闭切换 */}
                  <button
                    onClick={() => {
                      triggerHapticFeedback(15);
                      updateCategoryBudget(category, {
                        isEnabled: !budget.isEnabled,
                        weeklyTargetHours: budget.weeklyTargetHours || (budget.isEnabled ? 0 : 10),
                      });
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                      budget.isEnabled
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/60'
                    }`}
                  >
                    {budget.isEnabled ? '已开启' : '未开启'}
                  </button>
                </div>

                {/* 预算调整与推进面板 */}
                {budget.isEnabled ? (
                  <div className="space-y-2.5 pt-1">
                    {/* 调节栏：达标/上限切换与目标小时数步进器 */}
                    <div className="flex items-center justify-between bg-slate-800/60 p-2 rounded-xl">
                      {/* 预算类型切换 (≥ 达标型 vs ≤ 上限型) */}
                      <button
                        onClick={() => {
                          triggerHapticFeedback(15);
                          updateCategoryBudget(category, {
                            budgetType: budget.budgetType === 'AT_LEAST' ? 'AT_MOST' : 'AT_LEAST',
                          });
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center space-x-1 transition-all ${
                          budget.budgetType === 'AT_LEAST'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        <span>{budget.budgetType === 'AT_LEAST' ? '≥ 达标型(投入目标)' : '≤ 克制型(控制上限)'}</span>
                      </button>

                      {/* 目标小时数微调器 */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => {
                            triggerHapticFeedback(10);
                            const next = Math.max(1, (budget.weeklyTargetHours || 0) - 1);
                            updateCategoryBudget(category, { weeklyTargetHours: next });
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center active:scale-95"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-white text-xs px-1.5 min-w-[32px] text-center">
                          {budget.weeklyTargetHours}h
                        </span>
                        <button
                          onClick={() => {
                            triggerHapticFeedback(10);
                            const next = Math.min(168, (budget.weeklyTargetHours || 0) + 1);
                            updateCategoryBudget(category, { weeklyTargetHours: next });
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 双层进度条 (实际投入 vs 周时间流速对标线) */}
                    <div className="space-y-1">
                      <div className="w-full h-3 bg-slate-800 rounded-full relative overflow-hidden">
                        {/* 实际达成进度 */}
                        <div
                          style={{ width: `${Math.min(100, pace.percent)}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            budget.budgetType === 'AT_LEAST'
                              ? pace.percent >= 100
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                              : pace.percent > 100
                              ? 'bg-rose-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        {/* 自然周时间线刻度标志 */}
                        <div
                          style={{ left: `${weekTimeProgressPercent}%` }}
                          className="absolute top-0 bottom-0 w-0.5 bg-white/70 shadow-sm z-10"
                          title="当前周时间流速"
                        />
                      </div>

                      {/* 进度百分比与步调健康度徽章 */}
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-[11px] text-slate-400 font-mono">
                          完成度: <strong className="text-white">{pace.percent}%</strong>
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${pace.badgeClass}`}>
                          {pace.label}
                        </span>
                      </div>
                    </div>

                    {/* 推进评述 */}
                    <p className="text-[11px] text-slate-400 bg-slate-800/40 p-2 rounded-lg">
                      {pace.description}
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 py-1">
                    未开启周预算，点击右上角「未开启」即可配置周专注小时数与达成目标。
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
          <div className="flex items-center justify-between">
            {/* 活跃 / 归档 切换 */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => {
                  triggerHapticFeedback(15);
                  setFilterArchived(false);
                }}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
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
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                  filterArchived ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                已归档 ({archivedProjectsCount})
              </button>
            </div>

            {/* 新建项目按钮 */}
            <button
              onClick={handleOpenAdd}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center space-x-1 shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建目标</span>
            </button>
          </div>

          {/* 项目卡片列表 */}
          {displayedProjects.length === 0 ? (
            <div className="py-12 text-center space-y-3 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 p-6">
              <Target className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-xs text-slate-500">
                {filterArchived ? '暂无已归档的目标项目' : '暂无专属目标项目，点击右上角【新建目标】开启'}
              </p>
            </div>
          ) : (
            displayedProjects.map((project) => {
              const spentMinutes = getProjectDurationMinutes(project.id, project.period, now);
              const pace = evaluatePace(spentMinutes, project.targetHours, project.budgetType, now);

              return (
                <div
                  key={project.id}
                  className="rounded-2xl p-4 bg-slate-900/80 border border-slate-800 space-y-3 shadow-md hover:border-slate-700 transition"
                  style={{ borderLeft: `4px solid ${project.color}` }}
                >
                  {/* 项目头部信息 */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 min-w-0 flex-1 pr-2">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <h4 className="text-sm font-bold text-white truncate">{project.name}</h4>
                        {project.category && project.category !== project.name && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {project.category}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 font-mono">
                          {project.period === 'WEEKLY' ? '周目标' : '累计目标'} {project.targetHours}h
                        </span>
                      </div>

                      {project.description && (
                        <p className="text-xs text-slate-400 line-clamp-1">{project.description}</p>
                      )}
                    </div>

                    {/* 步调健康度徽章 */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${pace.badgeClass}`}>
                      {pace.label}
                    </span>
                  </div>

                  {/* 触发词徽章 */}
                  {project.keywords.length > 0 && (
                    <div className="flex items-center space-x-1 flex-wrap gap-1">
                      {project.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 font-mono"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 进度条 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-mono">
                        已投入: <strong className="text-indigo-400">{formatDuration(spentMinutes)}</strong>
                      </span>
                      <span className="font-mono font-bold text-white text-xs">{pace.percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
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
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    {/* 一键启动专注计时 */}
                    <button
                      onClick={() => {
                        triggerHapticFeedback(30);
                        startRealtimeActivity(
                          project.name,
                          project.name,
                          project.keywords,
                          project.id
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center space-x-1.5 active:scale-95 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-indigo-300" />
                      <span>开启此项目专注</span>
                    </button>

                    {/* 项目辅助操作按钮 */}
                    <div className="flex items-center space-x-2">
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
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center px-3 pt-3 animate-in fade-in duration-200"
          style={{
            paddingTop: 'calc(0.75rem + var(--safe-top, 0px))',
            paddingBottom: 'calc(0.75rem + var(--safe-bottom, 0px))',
          }}
        >
          <div 
            className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 overflow-y-auto no-scrollbar"
            style={{
              maxHeight: 'calc(100vh - 2rem - var(--safe-top, 0px) - var(--safe-bottom, 0px))',
            }}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-400" />
                <span>{editingProject ? '编辑专属目标项目' : '新建专属目标项目'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* 表单正文 */}
            <form onSubmit={handleSaveProject} className="space-y-3.5">
              {/* 项目名称 */}
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

              {/* 周期维度与达成类型 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">周期维度</label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="WEEKLY">自然周目标 (每周重置)</option>
                    <option value="TOTAL">长期累计总目标</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">目标类型</label>
                  <select
                    value={formData.budgetType}
                    onChange={(e) => setFormData({ ...formData, budgetType: e.target.value as BudgetType })}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="AT_LEAST">≥ 达标型 (力求达成)</option>
                    <option value="AT_MOST">≤ 克制型 (控制上限)</option>
                  </select>
                </div>
              </div>

              {/* 目标小时数 */}
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

              {/* 主题配色选择 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <span>主题配色</span>
                </label>
                <div className="flex items-center space-x-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        formData.color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-70'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* 触发词与自动识别 */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">智能触发词 (逗号分隔)</label>
                <input
                  type="text"
                  placeholder="如：论文, 毕业, 答辩, 查重"
                  value={formData.keywordsStr}
                  onChange={(e) => setFormData({ ...formData, keywordsStr: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500">
                  在随手记输入包含这些词语时，系统将自动关联至此目标项目。
                </p>
              </div>

              {/* 项目备注 */}
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

              {/* 提交按钮 */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition active:scale-95"
                >
                  {editingProject ? '保存更新' : '立即创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
