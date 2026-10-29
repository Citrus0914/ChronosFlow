import React, { useState } from 'react';
import { useTimeStore } from '../store/useTimeStore';
import { formatDuration } from '../lib/utils';
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
  Clock,
  CheckCircle2,
  Hash,
  X,
  Palette,
  FolderPlus,
  Compass,
} from 'lucide-react';

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

const CATEGORIES = [
  '开发/技术',
  '工作/业务',
  '学习/提升',
  '健康/运动',
  '休闲/生活',
  '其他工作',
];

export const GoalsView: React.FC = () => {
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

  // 项目新建/编辑弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectGoal | null>(null);
  const [formError, setFormError] = useState('');

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    color: '#6366f1',
    description: '',
    category: '开发/技术',
    keywordsStr: '',
    targetHours: '',
    period: 'WEEKLY' as 'WEEKLY' | 'TOTAL',
    budgetType: 'AT_LEAST' as BudgetType,
  });

  const now = new Date();
  const weekTimeProgress = getCurrentWeekTimeProgress(now);
  const weekTimeProgressPercent = Math.round(weekTimeProgress * 100);

  // 计算本周所有启用的预算与投入
  const enabledBudgets = categoryBudgets.filter((b) => b.isEnabled);
  const totalWeeklyTargetHours = enabledBudgets.reduce((sum, b) => sum + b.weeklyTargetHours, 0);
  const totalWeeklySpentMinutes = enabledBudgets.reduce(
    (sum, b) => sum + getCategorySpentMinutes(b.category, 'WEEK', now),
    0
  );

  const openCreateModal = () => {
    setEditingProject(null);
    setFormError('');
    setFormData({
      name: '',
      color: PRESET_COLORS[projectGoals.length % PRESET_COLORS.length],
      description: '',
      category: '开发/技术',
      keywordsStr: '',
      targetHours: '',
      period: 'WEEKLY',
      budgetType: 'AT_LEAST',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (proj: ProjectGoal) => {
    setEditingProject(proj);
    setFormError('');
    setFormData({
      name: proj.name,
      color: proj.color,
      description: proj.description || '',
      category: proj.category,
      keywordsStr: proj.keywords.join(', '),
      targetHours: proj.targetHours.toString(),
      period: proj.period,
      budgetType: proj.budgetType,
    });
    setIsModalOpen(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('请输入项目名称');
      return;
    }

    if (!formData.targetHours.trim()) {
      setFormError('请输入目标投入时长');
      return;
    }

    const parsedHours = parseInt(formData.targetHours, 10);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      setFormError('请输入大于 0 的目标投入时长（小时）');
      return;
    }

    const keywords = formData.keywordsStr
      .split(/[,，、\s]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (editingProject) {
      updateProjectGoal(editingProject.id, {
        name: formData.name.trim(),
        color: formData.color,
        description: formData.description.trim() || undefined,
        category: formData.category,
        keywords,
        targetHours: parsedHours,
        period: formData.period,
        budgetType: formData.budgetType,
      });
    } else {
      addProjectGoal({
        name: formData.name.trim(),
        color: formData.color,
        description: formData.description.trim() || undefined,
        category: formData.category,
        keywords,
        targetHours: parsedHours,
        period: formData.period,
        budgetType: formData.budgetType,
      });
    }

    setIsModalOpen(false);
  };

  // 专属项目一键启动专注
  const handleStartProjectFocus = (proj: ProjectGoal) => {
    startRealtimeActivity(proj.name, proj.category, [proj.category.split('/')[0], proj.name], proj.id);
  };

  const displayedProjects = projectGoals.filter((p) => (filterArchived ? p.isArchived : !p.isArchived));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 头部标题与顶层操作 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1 border-b border-white/5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 mr-2.5">
              <Target className="w-5 h-5" />
            </span>
            目标计划与时间预算
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            双向时间预算追踪与专属目标推进，按周动态评估时间节奏健康度
          </p>
        </div>

        {/* 顶部操作区 */}
        <div className="flex items-center space-x-2.5">
          {/* 子 Tab 切换 */}
          <div className="flex items-center p-1 bg-white/5 border border-white/5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('BUDGETS')}
              className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                activeTab === 'BUDGETS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              分类周预算
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PROJECTS')}
              className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer flex items-center space-x-1 ${
                activeTab === 'PROJECTS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>专属目标项目</span>
              {projectGoals.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
                  {projectGoals.filter((p) => !p.isArchived).length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'PROJECTS' && (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新建目标项目</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: 分类周预算看板 */}
      {activeTab === 'BUDGETS' && (
        <div className="space-y-6">
          {/* 本周宏观进度仪表盘 */}
          <div className="p-5 rounded-2xl bg-[#111827] border border-white/10 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                    自然周节奏监测
                  </span>
                  <span className="text-xs text-slate-400">周一至周日全景投入</span>
                </div>
                <div className="mt-2.5 flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-white">
                    {formatDuration(totalWeeklySpentMinutes)}
                  </span>
                  <span className="text-xs text-slate-400">
                    / 目标总计 {totalWeeklyTargetHours} 小时
                  </span>
                </div>
              </div>

              {/* 时间线流逝指示器 */}
              <div className="w-full md:w-80 space-y-2 p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center text-[11px]">
                    <Clock className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                    当前周时间流逝
                  </span>
                  <span className="font-bold text-white text-[11px]">{weekTimeProgressPercent}%</span>
                </div>
                {/* 双层对比进度条 */}
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                    style={{ width: `${weekTimeProgressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  建议下限型投入进度 ≥ {weekTimeProgressPercent}%，上限型克制投入 &lt; {weekTimeProgressPercent}%
                </p>
              </div>
            </div>
          </div>

          {/* 分类预算卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryBudgets.map((budget) => {
              const actualMinutes = getCategorySpentMinutes(budget.category, 'WEEK', now);
              const evaluation = evaluatePace(
                actualMinutes,
                budget.weeklyTargetHours,
                budget.budgetType,
                now
              );

              return (
                <div
                  key={budget.category}
                  className={`p-4 rounded-2xl bg-[#111827] border transition-all duration-200 ${
                    budget.isEnabled
                      ? 'border-white/10 hover:border-white/20 shadow-lg'
                      : 'border-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between pb-3 border-b border-white/5">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">{budget.category}</span>
                        {budget.isEnabled && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${evaluation.badgeClass}`}
                          >
                            {evaluation.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {budget.budgetType === 'AT_LEAST' ? '至少投入达标型' : '不超过上限克制型'}
                      </p>
                    </div>

                    {/* 启用/停用开关 */}
                    <button
                      type="button"
                      onClick={() =>
                        updateCategoryBudget(budget.category, { isEnabled: !budget.isEnabled })
                      }
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                        budget.isEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {budget.isEnabled ? '启用中' : '已停用'}
                    </button>
                  </div>

                  {budget.isEnabled ? (
                    <div className="pt-3 space-y-3">
                      {/* 投入数据与进度 */}
                      <div>
                        <div className="flex items-baseline justify-between text-xs mb-1.5">
                          <span className="text-white font-bold text-base">
                            {formatDuration(actualMinutes)}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            周目标 {budget.weeklyTargetHours}h ({evaluation.percent}%)
                          </span>
                        </div>
                        {/* 进度条 */}
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              budget.budgetType === 'AT_LEAST'
                                ? evaluation.percent >= 100
                                  ? 'bg-emerald-500'
                                  : 'bg-indigo-500'
                                : evaluation.percent > 100
                                ? 'bg-rose-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, evaluation.percent)}%` }}
                          />
                        </div>
                      </div>

                      {/* 节奏诊断微文案 */}
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {evaluation.description}
                      </p>

                      {/* 快速调节工具栏 */}
                      <div className="pt-1 flex items-center justify-between text-xs border-t border-white/5">
                        {/* 预算类型切换 */}
                        <button
                          type="button"
                          onClick={() =>
                            updateCategoryBudget(budget.category, {
                              budgetType: budget.budgetType === 'AT_LEAST' ? 'AT_MOST' : 'AT_LEAST',
                            })
                          }
                          className="text-[10px] text-slate-400 hover:text-indigo-400 transition cursor-pointer"
                        >
                          切换为：{budget.budgetType === 'AT_LEAST' ? '上限型 (≤)' : '达标型 (≥)'}
                        </button>

                        {/* 目标小时数加减 */}
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateCategoryBudget(budget.category, {
                                weeklyTargetHours: Math.max(1, budget.weeklyTargetHours - 2),
                              })
                            }
                            className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-[11px] font-semibold text-white px-1">
                            {budget.weeklyTargetHours}h
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCategoryBudget(budget.category, {
                                weeklyTargetHours: budget.weeklyTargetHours + 2,
                              })
                            }
                            className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500">
                      该分类预算已关闭，点击右上角开启
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: 专属目标项目网格 */}
      {activeTab === 'PROJECTS' && (
        <div className="space-y-4">
          {/* 筛选与状态栏 */}
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <div className="flex items-center space-x-1.5 p-0.5 rounded-xl bg-white/5 border border-white/5">
              <button
                type="button"
                onClick={() => setFilterArchived(false)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer font-medium ${
                  !filterArchived
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                进行中 ({projectGoals.filter((p) => !p.isArchived).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterArchived(true)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer font-medium ${
                  filterArchived
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                已归档 ({projectGoals.filter((p) => p.isArchived).length})
              </button>
            </div>

            {filterArchived && (
              <button
                type="button"
                onClick={() => setFilterArchived(false)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition cursor-pointer"
              >
                <span>← 返回进行中项目</span>
              </button>
            )}
          </div>

          {displayedProjects.length === 0 ? (
            /* 空状态卡片 */
            <div className="p-12 text-center rounded-2xl bg-[#111827] border border-dashed border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">
                {filterArchived ? '暂无归档项目' : '还没有创建任何专属目标项目'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {filterArchived
                  ? '当项目阶段性完成或暂停时，可以将其归档；归档后随时可解除归档重新激活。'
                  : '为重要的事情（如“ChronosFlow核心重构”、“考研备战”、“软考冲刺”）设立独立目标，随手记自动关联并累积专属投入！'}
              </p>
              {filterArchived ? (
                <button
                  type="button"
                  onClick={() => setFilterArchived(false)}
                  className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                >
                  <span>← 返回进行中项目</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>创建第一个目标项目</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedProjects.map((project) => {
                const totalMinutes = getProjectDurationMinutes(project.id, project.period, now);
                const targetMinutes = project.targetHours * 60;
                const percent = Math.round((totalMinutes / targetMinutes) * 100);

                return (
                  <div
                    key={project.id}
                    className="p-5 rounded-2xl bg-[#111827] border border-white/10 hover:border-white/20 shadow-xl transition-all duration-200 relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* 顶部色彩饰条 */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{ backgroundColor: project.color }}
                    />

                    <div>
                      {/* 项目标题与分类 */}
                      <div className="flex items-start justify-between gap-2 pt-1">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: project.color }}
                            />
                            <h3 className="font-bold text-base text-white truncate max-w-[180px]">
                              {project.name}
                            </h3>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-1 block">
                            归属于 · {project.category} · {project.period === 'WEEKLY' ? '周度目标' : '总里程碑'}
                          </span>
                        </div>

                        {/* 状态药丸 */}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                            percent >= 100
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-white/5 text-slate-300 border-white/10'
                          }`}
                        >
                          {percent >= 100 ? '已达成 🏆' : `${percent}%`}
                        </span>
                      </div>

                      {project.description && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      {/* 投入进度 */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-bold text-white text-base">
                            {formatDuration(totalMinutes)}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            目标 {project.targetHours} 小时
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, percent)}%`,
                              backgroundColor: project.color,
                            }}
                          />
                        </div>
                      </div>

                      {/* 自动匹配关键词药丸 */}
                      {project.keywords.length > 0 && (
                        <div className="mt-3 flex items-center flex-wrap gap-1">
                          <span className="text-[10px] text-slate-500 flex items-center">
                            <Hash className="w-2.5 h-2.5 mr-0.5" /> 触发词:
                          </span>
                          {project.keywords.map((kw) => (
                            <span
                              key={kw}
                              className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-300"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 底部操作条 */}
                    <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleStartProjectFocus(project)}
                        disabled={project.isArchived}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>专注此项目</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(project)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                          title="编辑项目"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleArchiveProject(project.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                          title={project.isArchived ? '解除归档' : '归档项目'}
                        >
                          {project.isArchived ? (
                            <ArchiveRestore className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`确定删除项目「${project.name}」吗？已记录的时间块仍会保留，但将解绑项目关联。`)) {
                              deleteProjectGoal(project.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="删除项目"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 新建/编辑项目目标模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <FolderPlus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingProject ? '编辑目标项目' : '新建专属目标项目'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    设定目标时长与关联词，输入大白话时自动累积
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 表单内容 */}
            <form onSubmit={handleSaveProject} noValidate className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  ⚠️ {formError}
                </div>
              )}

              {/* 项目名称 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  项目名称 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：ChronosFlow核心重构、考研英语备考..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                  autoFocus
                />
              </div>

              {/* 主题色选择 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center">
                  <Palette className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                  专属主题色
                </label>
                <div className="flex items-center space-x-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      className={`w-7 h-7 rounded-xl transition cursor-pointer flex items-center justify-center ${
                        formData.color === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {formData.color === c && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 归属基础分类 & 周期类型 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">归属主分类</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-[#111827] text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">目标周期</label>
                  <select
                    value={formData.period}
                    onChange={(e) =>
                      setFormData({ ...formData, period: e.target.value as 'WEEKLY' | 'TOTAL' })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="WEEKLY" className="bg-[#111827] text-white">
                      每周目标 (按周重置)
                    </option>
                    <option value="TOTAL" className="bg-[#111827] text-white">
                      总里程碑 (跨周累积)
                    </option>
                  </select>
                </div>
              </div>

              {/* 目标时长 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  目标投入时长 (小时)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={formData.targetHours}
                    onChange={(e) =>
                      setFormData({ ...formData, targetHours: e.target.value })
                    }
                    placeholder="请输入目标小时数"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500 transition pr-12"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400">小时</span>
                </div>
              </div>

              {/* 智能关联触发词 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center">
                    <Hash className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                    智能关联触发词 / 标签
                  </span>
                  <span className="text-[10px] text-slate-500">用逗号或空格分隔</span>
                </label>
                <input
                  type="text"
                  value={formData.keywordsStr}
                  onChange={(e) => setFormData({ ...formData, keywordsStr: e.target.value })}
                  placeholder="例如：时流, chronos, 代码重构"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <p className="text-[10px] text-slate-400">
                  当随手记包含这些词或输入 #项目名 标签时，系统将自动关联归集到本项目
                </p>
              </div>

              {/* 项目简介备注 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">项目备注 / 愿景 (选填)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="记录该目标的核心目的或交付成果..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              {/* 底部按钮 */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition cursor-pointer"
                >
                  {editingProject ? '保存修改' : '确认创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
