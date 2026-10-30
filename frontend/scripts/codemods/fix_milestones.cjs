const fs = require('fs');

let content = fs.readFileSync('src/pages/Milestones.tsx', 'utf8');

const target1 = `<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                 <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-xl hover:bg-stone-100 border border-transparent hover:border-stone-200"
                  onClick={() => handleOpenModal(milestone)}
                 >
                  <MoreVertical className="w-5 h-5 text-stone-400" />
                 </Button>
                </div>`;

const replacement1 = `<div className="flex items-center gap-2 relative">
                 <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-10 w-10 rounded-xl hover:bg-stone-100 border border-transparent hover:border-stone-200 transition-all", menuOpenId === milestone.id ? "opacity-100 bg-stone-100" : "opacity-0 group-hover:opacity-100")}
                  onClick={() => setMenuOpenId(menuOpenId === milestone.id ? null : milestone.id)}
                 >
                  <MoreVertical className="w-5 h-5 text-stone-400" />
                 </Button>

                 <AnimatePresence>
                  {menuOpenId === milestone.id && (
                   <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-12 w-48 bg-white border border-stone-100 shadow-xl rounded-2xl py-2 z-10"
                   >
                    <button 
                     onClick={() => { handleOpenModal(milestone); setMenuOpenId(null); }}
                     className="w-full px-4 py-2 text-left text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors flex items-center gap-2 font-medium"
                    >
                     <Target className="w-4 h-4" /> Edit Milestone
                    </button>
                    <button 
                     onClick={() => { setDeletingMilestone(milestone); setMenuOpenId(null); }}
                     className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
                    >
                     <Trash2 className="w-4 h-4" /> Delete Milestone
                    </button>
                   </motion.div>
                  )}
                 </AnimatePresence>
                </div>`;

content = content.replace(target1, replacement1);

const target2 = `{milestone.tasks && milestone.tasks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                 {milestone.tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 p-2 bg-stone-50/50 rounded-xl border border-stone-100/50">
                   <div className={cn(
                    "w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                    task.completed ? "bg-stone-900 border-stone-900" : "border-stone-200"
                   )}>
                    {task.completed && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                   </div>
                   <span className={cn(
                    "text-xs font-medium uppercase tracking-widest truncate",
                    task.completed ? "text-stone-400 line-through" : "text-stone-600"
                   )}>{task.title}</span>
                  </div>
                 ))}
                </div>
               )}`;

const replacement2 = `<div className="pt-2 flex flex-col gap-3">
                {milestone.tasks && milestone.tasks.length > 0 && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {milestone.tasks.map(task => (
                   <div key={task.id} className="flex items-center gap-2 p-2 bg-stone-50/50 rounded-xl border border-stone-100/50 hover:border-stone-200 transition-colors">
                    <button
                     onClick={() => handleToggleTaskInMilestone(milestone.id, task.id)}
                     className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900/10",
                      task.completed ? "bg-stone-900 border-stone-900" : "bg-white border-stone-300 hover:border-stone-400 text-transparent"
                     )}
                    >
                     <CheckCircle2 className={cn("w-3 h-3", task.completed ? "text-white" : "text-stone-300 opacity-0")} />
                    </button>
                    <span 
                     onClick={() => handleToggleTaskInMilestone(milestone.id, task.id)}
                     className={cn(
                      "text-xs font-medium uppercase tracking-widest truncate cursor-pointer select-none",
                      task.completed ? "text-stone-400 line-through" : "text-stone-600"
                     )}
                    >
                     {task.title}
                    </span>
                   </div>
                  ))}
                 </div>
                )}
                <div className="flex items-center gap-2">
                 <input 
                  type="text" 
                  placeholder="+ Add a new task..." 
                  value={newTaskTitles[milestone.id] || ''}
                  onChange={(e) => setNewTaskTitles(prev => ({ ...prev, [milestone.id]: e.target.value }))}
                  onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewTaskToMilestone(milestone.id);
                   }
                  }}
                  className="text-xs bg-stone-50 px-3 py-2 rounded-xl border border-stone-100 focus:outline-none focus:border-stone-300 focus:ring-2 focus:ring-stone-900/5 transition-all outline-none md:w-1/2 w-full"
                 />
                 {newTaskTitles[milestone.id] && newTaskTitles[milestone.id].trim().length > 0 && (
                  <button 
                   onClick={() => handleAddNewTaskToMilestone(milestone.id)}
                   className="text-white bg-stone-900 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-stone-800 transition-colors"
                  >
                   Add
                  </button>
                 )}
                </div>
               </div>`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/pages/Milestones.tsx', content);
