import React, { useState } from 'react';
import { usePortalState } from '../portal-state';
import { Users, Mail, Trash2, Key, UserPlus, X, Clock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PeopleView({ t, showToast }: any) {
  const { people, setPeople } = usePortalState();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'member'|'admin'>('member');
  const [resentInvites, setResentInvites] = useState<string[]>([]);
  
  const [filter, setFilter] = useState('All');
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);

  const roles = ['All', 'admin', 'member'];
  const filteredPeople = people.filter((p:any) => filter === 'All' || p.role.toLowerCase() === filter.toLowerCase());

  const mockLogs = [
    { action: "Logged in via SSO", date: "Today, 09:41 AM", ip: "192.168.1.1" },
    { action: "Downloaded Invoice #INV-2025-0104", date: "Yesterday, 14:20", ip: "192.168.1.1" },
    { action: "Updated company profile", date: "Oct 12, 11:15 AM", ip: "192.168.1.1" }
  ];

  const handleInvite = () => {
    if(!newEmail) return;
    setPeople([...people, { id: `p${Date.now()}`, name: newEmail.split('@')[0], email: newEmail, role: newRole, lastAccess: 'Never', status: 'pending' }]);
    setNewEmail('');
    setInviteModalOpen(false);
    showToast(`Invite sent to ${newEmail}`);
  };

  const handleRevoke = (id: string, role: string) => {
    if (role === 'admin') {
      const adminCount = people.filter((p:any) => p.role === 'admin' && p.id !== id).length;
      if (adminCount === 0) {
        showToast('Cannot remove the last administrator.');
        return;
      }
    }
    setPeople(people.filter((p:any) => p.id !== id));
    showToast('Access revoked');
  };

  const handleResend = (id: string) => {
    setResentInvites(prev => [...prev, id]);
    showToast('Invite resent');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
            <h2 className="text-3xl font-serif font-light mb-2">Team Access</h2>
            <p className="text-sm text-muted-foreground">Manage who from your company can access the portal.</p>
         </div>
         <button onClick={() => setInviteModalOpen(true)} className="px-6 py-3 bg-foreground text-background rounded-full font-bold text-sm shadow-sm hover:scale-95 transition-transform flex items-center gap-2">
           <UserPlus className="w-4 h-4"/> Invite Colleague
         </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {roles.map(r => (
          <button key={r} onClick={() => setFilter(r)} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-colors capitalize", filter === r ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {r}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-[40px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/20 border-b border-border">
              <tr>
                <th className="p-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Name</th>
                <th className="p-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Role</th>
                <th className="p-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Status</th>
                <th className="p-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Last Access</th>
                <th className="p-6 text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPeople.map((p:any) => (
                <React.Fragment key={p.id}>
                  <tr onClick={() => setExpandedPersonId(expandedPersonId === p.id ? null : p.id)} className="hover:bg-muted/10 transition-colors cursor-pointer group">
                    <td className="p-6 flex items-center gap-4">
                      {expandedPersonId === p.id ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0"/> : <ChevronUp className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"/>}
                      <div>
                        <div className="font-bold text-foreground text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={cn("text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full", p.role === 'admin' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        {p.role}
                      </span>
                    </td>
                    <td className="p-6">
                      {p.status === 'pending' ? (
                        <span className="text-xs font-bold text-orange-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>
                      ) : (
                        <span className="text-xs font-bold text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Active</span>
                      )}
                    </td>
                    <td className="p-6 text-sm text-muted-foreground">{p.lastAccess}</td>
                    <td className="p-6 text-right space-x-3">
                      {p.status === 'pending' && (
                        resentInvites.includes(p.id) ? (
                          <span className="text-xs font-bold text-green-600">Resent ✓</span>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleResend(p.id); }} className="text-xs font-bold text-foreground hover:underline">Resend</button>
                        )
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleRevoke(p.id, p.role); }} className="text-xs font-bold text-destructive hover:underline">Revoke</button>
                    </td>
                  </tr>
                  
                  <AnimatePresence>
                    {expandedPersonId === p.id && (
                      <tr>
                        <td colSpan={5} className="p-0 border-b border-border bg-muted/5">
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                              {/* Permissions Summary */}
                              <div>
                                 <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4">Permissions Overview</div>
                                 <ul className="space-y-3">
                                   <li className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-green-500"/> View Member Directory</li>
                                   <li className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-green-500"/> Register for Events</li>
                                   {p.role === 'admin' ? (
                                     <>
                                       <li className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-green-500"/> Manage Billing & Invoices</li>
                                       <li className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-green-500"/> Invite & Revoke Users</li>
                                     </>
                                   ) : (
                                     <>
                                       <li className="flex items-center gap-2 text-sm text-muted-foreground opacity-50"><X className="w-4 h-4"/> Manage Billing & Invoices</li>
                                       <li className="flex items-center gap-2 text-sm text-muted-foreground opacity-50"><X className="w-4 h-4"/> Invite & Revoke Users</li>
                                     </>
                                   )}
                                 </ul>
                              </div>
                              {/* Access Logs */}
                              <div>
                                 <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-4">Recent Activity</div>
                                 {p.status === 'pending' ? (
                                   <div className="text-sm text-muted-foreground italic">User has not activated their account yet.</div>
                                 ) : (
                                   <div className="space-y-4">
                                      {mockLogs.map((log, i) => (
                                         <div key={i} className="flex gap-4 items-start">
                                           <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"/>
                                           <div>
                                             <div className="text-sm font-medium leading-none mb-1">{log.action}</div>
                                             <div className="text-xs text-muted-foreground">{log.date} &bull; {log.ip}</div>
                                           </div>
                                         </div>
                                      ))}
                                   </div>
                                 )}
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
              
              {filteredPeople.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    No members found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setInviteModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card border border-border shadow-2xl rounded-[40px] p-8 md:p-10 w-full max-w-2xl relative z-10">
              <button onClick={() => setInviteModalOpen(false)} className="absolute top-8 right-8 text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
              <h3 className="text-3xl font-serif font-light mb-2">Invite Colleague</h3>
              <p className="text-sm text-muted-foreground mb-8">Send an invitation to join your company's AmCham portal.</p>
              
              <div className="space-y-8 mb-8">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Email Address</label>
                  <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className="w-full bg-muted/30 border border-border rounded-2xl p-4 text-sm focus:outline-none focus:border-primary" placeholder="colleague@company.com" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-foreground mb-4">Role & Permissions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={cn("border rounded-3xl p-6 cursor-pointer transition-all", newRole === 'member' ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/30")}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="font-bold text-lg">Member</div>
                        <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", newRole === 'member' ? "border-primary" : "border-muted-foreground")}>
                          {newRole === 'member' && <div className="w-3 h-3 bg-primary rounded-full"/>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-2">
                        <div className="flex gap-2 items-center"><CheckCircle className="w-3 h-3 text-green-500"/> View Directory</div>
                        <div className="flex gap-2 items-center"><CheckCircle className="w-3 h-3 text-green-500"/> Register for Events</div>
                        <div className="flex gap-2 items-center opacity-50"><X className="w-3 h-3"/> Cannot see billing</div>
                        <div className="flex gap-2 items-center opacity-50"><X className="w-3 h-3"/> Cannot invite others</div>
                      </div>
                      <input type="radio" checked={newRole==='member'} onChange={()=>setNewRole('member')} className="sr-only"/>
                    </label>

                    <label className={cn("border rounded-3xl p-6 cursor-pointer transition-all", newRole === 'admin' ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/30")}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="font-bold text-lg">Admin</div>
                        <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", newRole === 'admin' ? "border-primary" : "border-muted-foreground")}>
                          {newRole === 'admin' && <div className="w-3 h-3 bg-primary rounded-full"/>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-2">
                        <div className="flex gap-2 items-center"><CheckCircle className="w-3 h-3 text-green-500"/> All Member features</div>
                        <div className="flex gap-2 items-center"><CheckCircle className="w-3 h-3 text-green-500"/> Manage Billing</div>
                        <div className="flex gap-2 items-center"><CheckCircle className="w-3 h-3 text-green-500"/> View Invoices</div>
                        <div className="flex gap-2 items-center"><CheckCircle className="w-3 h-3 text-green-500"/> Invite/Revoke Users</div>
                      </div>
                      <input type="radio" checked={newRole==='admin'} onChange={()=>setNewRole('admin')} className="sr-only"/>
                    </label>
                  </div>
                </div>
              </div>
              
              <button onClick={handleInvite} disabled={!newEmail.includes('@')} className="w-full px-6 py-4 rounded-full font-bold text-sm bg-primary text-primary-foreground disabled:opacity-50 transition-transform active:scale-95">Send Invitation</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
