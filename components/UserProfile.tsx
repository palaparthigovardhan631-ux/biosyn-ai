
import React, { useState } from 'react';
import { User, Language, HealthPerception } from '../types';
import { translations } from '../translations';

interface UserProfileProps {
  user: User;
  onUpdateUser: (user: User) => void;
  language: Language;
  onViewReport: (report: HealthPerception) => void;
  onDeleteHistory: (id: string) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdateUser, language, onViewReport, onDeleteHistory }) => {
  const t = translations[language] || translations['English'];
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User>(user);
  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    onUpdateUser(editedUser);
    setIsEditing(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fadeIn">
      {showToast && (
        <div className="fixed top-24 right-8 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-bounce">
          {t.profileSaved}
        </div>
      )}

      <div className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">{t.userProfile}</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{user.email}</p>
        </div>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
            isEditing ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          {isEditing ? t.saveProfile : t.editProfile}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col items-center">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-600/20 mb-4 bg-slate-800 flex items-center justify-center">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-slate-700">{user.name.charAt(0)}</span>
              )}
            </div>
            <h3 className="text-xl font-black text-white">{user.name}</h3>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
              {t.personalInfo}
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.age}</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedUser.age || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, age: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                  />
                ) : (
                  <p className="text-white font-bold">{user.age || '--'}</p>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.gender}</label>
                {isEditing ? (
                  <select
                    value={editedUser.gender || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, gender: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="text-white font-bold">{user.gender || '--'}</p>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.bloodType}</label>
                {isEditing ? (
                  <select
                    value={editedUser.bloodType || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, bloodType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <p className="text-white font-bold">{user.bloodType || '--'}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.weight}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.weight || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, weight: e.target.value })}
                      placeholder="e.g. 70kg"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-white font-bold">{user.weight || '--'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.height}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.height || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, height: e.target.value })}
                      placeholder="e.g. 175cm"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-white font-bold">{user.height || '--'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
              {t.contactDetails}
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.mobile}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUser.mobile || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, mobile: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                  />
                ) : (
                  <p className="text-white font-bold">{user.mobile || '9014280366'}</p>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.instagram}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUser.instagram || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, instagram: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                  />
                ) : (
                  <p className="text-white font-bold">{user.instagram || '__goavrdhan__oo7'}</p>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t.address}</label>
                {isEditing ? (
                  <textarea
                    value={editedUser.address || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 resize-none h-20"
                  />
                ) : (
                  <p className="text-white font-bold text-xs leading-relaxed">{user.address || 'manikonda 521260 near-(vijayawada)'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6">
            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">
                {t.allergies}
              </h4>
              {isEditing ? (
                <textarea
                  value={editedUser.allergies || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, allergies: e.target.value })}
                  className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-500 resize-none"
                  placeholder="List any food, drug, or environmental allergies..."
                />
              ) : (
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {user.allergies || "No allergies reported."}
                </p>
              )}
            </div>

            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">
                {t.medicalHistoryLabel}
              </h4>
              {isEditing ? (
                <textarea
                  value={editedUser.medicalHistory || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, medicalHistory: e.target.value })}
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-500 resize-none"
                  placeholder="List any chronic conditions, past surgeries, or family medical history..."
                />
              ) : (
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {user.medicalHistory || "No medical history provided."}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
              {t.healthHistory}
            </h4>
            <div className="space-y-4">
              {user.healthHistory && user.healthHistory.length > 0 ? (
                user.healthHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/50 hover:bg-slate-900 transition-all cursor-pointer group relative overflow-hidden"
                    onClick={() => item.fullReport && onViewReport(item.fullReport)}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                      <div 
                        className="bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-500 transition-colors"
                        onClick={(e) => { e.stopPropagation(); item.fullReport && onViewReport(item.fullReport); }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <div 
                        className="bg-red-600 text-white p-2 rounded-lg shadow-lg hover:bg-red-500 transition-colors"
                        onClick={(e) => { e.stopPropagation(); onDeleteHistory(item.id); }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{item.date}</span>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        item.severity === 'Emergency' ? 'bg-red-900/20 text-red-500' :
                        item.severity === 'High' ? 'bg-orange-900/20 text-orange-500' :
                        'bg-emerald-900/20 text-emerald-500'
                      }`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-white font-bold mb-2 pr-12">{item.symptoms}</p>
                    <p className="text-slate-400 text-sm italic">"{item.perception}"</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-3xl">
                  <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">{t.noHistory}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
