import React, { useState } from 'react';
import { User, Skill } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, Tag, Briefcase, Globe, Zap } from 'lucide-react';
import { useT } from '../../lib/language';
import { labelOf } from '../../lib/labels';

interface TaxonomySettingsProps {
 user: User;
}

export default function TaxonomySettings({ user }: TaxonomySettingsProps) {
 const t = useT();
 const [activeTab, setActiveTab] = useState<'skills' | 'industries' | 'roles' | 'tags'>('skills');
 const [searchQuery, setSearchQuery] = useState('');

 const [skills, setSkills] = useState<Skill[]>([
  { id: '1', name: 'Product Management', category: 'Business', description: 'Defining product vision and strategy' },
  { id: '2', name: 'Full-stack Development', category: 'Technical', description: 'Building end-to-end web applications' },
  { id: '3', name: 'Growth Marketing', category: 'Marketing', description: 'Scaling user acquisition and retention' },
  { id: '4', name: 'UI/UX Design', category: 'Design', description: 'Creating user-centric interfaces and experiences' },
  { id: '5', name: 'Venture Capital', category: 'Finance', description: 'Fundraising and investment strategy' },
 ]);

 const filteredSkills = skills.filter(s => 
  s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
  s.category.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return (
  <div className="max-w-6xl mx-auto space-y-8">
   <div className="flex items-center justify-between">
    <div>
     <h1 className="text-xl font-medium tracking-tight text-stone-900">{t('Platform Taxonomies', 'Ταξινομίες πλατφόρμας')}</h1>
     <p className="text-stone-500 mt-1">{t('Manage the structured data that powers matching and discovery.', 'Διαχειρίσου τα δομημένα δεδομένα που τροφοδοτούν την αντιστοίχιση και την εξερεύνηση.')}</p>
    </div>
    <Button size="sm">
     <Plus className="w-4 h-4" />
     {activeTab === 'skills' ? t('Add New skill', 'Προσθήκη δεξιότητας') : activeTab === 'industries' ? t('Add New industrie', 'Προσθήκη κλάδου') : activeTab === 'roles' ? t('Add New role', 'Προσθήκη ρόλου') : t('Add New tag', 'Προσθήκη ετικέτας')}
    </Button>
   </div>

   <div className="scroll-tabs p-1 bg-stone-100 rounded-xl">
    <button
     onClick={() => setActiveTab('skills')}
     className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      activeTab === 'skills' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
     }`}
    >
     <Zap className="w-4 h-4" />
     {t('Skills', 'Δεξιότητες')}
    </button>
    <button
     onClick={() => setActiveTab('industries')}
     className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      activeTab === 'industries' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
     }`}
    >
     <Globe className="w-4 h-4" />
     {t('Industries', 'Κλάδοι')}
    </button>
    <button
     onClick={() => setActiveTab('roles')}
     className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      activeTab === 'roles' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
     }`}
    >
     <Briefcase className="w-4 h-4" />
     {t('Roles', 'Ρόλοι')}
    </button>
    <button
     onClick={() => setActiveTab('tags')}
     className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      activeTab === 'tags' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
     }`}
    >
     <Tag className="w-4 h-4" />
     {t('Tags', 'Ετικέτες')}
    </button>
   </div>

   <Card noPadding>
    <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-4">
     <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      <input
       type="text"
       placeholder={activeTab === 'skills' ? t('Search skills...', 'Αναζήτηση δεξιοτήτων...') : activeTab === 'industries' ? t('Search industries...', 'Αναζήτηση κλάδων...') : activeTab === 'roles' ? t('Search roles...', 'Αναζήτηση ρόλων...') : t('Search tags...', 'Αναζήτηση ετικετών...')}
       value={searchQuery}
       onChange={e => setSearchQuery(e.target.value)}
       className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
      />
     </div>
     <Button variant="outline" size="sm">
      <Filter className="w-4 h-4" />
      {t('Filters', 'Φίλτρα')}
     </Button>
    </div>

    <div className="overflow-x-auto">
     <table className="w-full text-left">
      <thead>
       <tr className="bg-stone-50/50 text-xs font-medium text-stone-400 tracking-wide border-b border-stone-100">
        <th className="px-4 py-2">{t('Name', 'Όνομα')}</th>
        <th className="px-4 py-2">{t('Category', 'Κατηγορία')}</th>
        <th className="px-4 py-2">{t('Description', 'Περιγραφή')}</th>
        <th className="px-4 py-2">{t('Usage Count', 'Χρήσεις')}</th>
        <th className="px-4 py-2 text-right">{t('Actions', 'Ενέργειες')}</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
       {filteredSkills.map((skill) => (
        <tr key={skill.id} className="hover:bg-stone-50/50 transition-colors group">
         <td className="px-4 py-2">
          <span className="font-medium text-stone-900">{skill.name}</span>
         </td>
         <td className="px-4 py-2">
          <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs font-medium tracking-wider">
           {labelOf(skill.category)}
          </span>
         </td>
         <td className="px-4 py-2">
          <p className="text-xs text-stone-500 line-clamp-1">{skill.description}</p>
         </td>
         <td className="px-4 py-2">
          <span className="text-xs font-medium text-stone-900">{t('124 users', '124 μέλη')}</span>
         </td>
         <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-900 transition-colors">
            <Edit2 className="w-4 h-4" />
           </button>
           <button className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-red-600 transition-colors">
            <Trash2 className="w-4 h-4" />
           </button>
           <button className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-900 transition-colors">
            <MoreVertical className="w-4 h-4" />
           </button>
          </div>
         </td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>
   </Card>
  </div>
 );
}
