'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { getSubjects, createSubject, deleteSubject, Subject } from '@/lib/db';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [subjectTitle, setSubjectTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        loadSubjects(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadSubjects = async (uid: string) => {
    try {
      const data = await getSubjects(uid);
      setSubjects(data);
    } catch (error: any) {
      console.error('Error loading subjects:', error);
      // Check if it's an index error
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        toast.error(
          'Firestore index required. Check browser console for index creation link.',
          { duration: 6000 }
        );
      } else {
        toast.error(`Failed to load subjects: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subjectTitle.trim()) return;

    setCreating(true);
    try {
      await createSubject(user.uid, subjectTitle.trim());
      setSubjectTitle('');
      setShowCreateForm(false);
      await loadSubjects(user.uid);
      toast.success('Subject created successfully!');
    } catch (error: any) {
      toast.error('Failed to create subject');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      await deleteSubject(subjectId);
      if (user) {
        await loadSubjects(user.uid);
      }
      toast.success('Subject deleted successfully!');
    } catch (error: any) {
      toast.error('Failed to delete subject');
      console.error(error);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">My Subjects</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showCreateForm ? 'Cancel' : '+ New Subject'}
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <form onSubmit={handleCreateSubject}>
                <div className="mb-4">
                  <label htmlFor="subjectTitle" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Title
                  </label>
                  <input
                    id="subjectTitle"
                    type="text"
                    value={subjectTitle}
                    onChange={(e) => setSubjectTitle(e.target.value)}
                    placeholder="e.g., Mathematics, History, Science"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Subject'}
                </button>
              </form>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">Loading subjects...</div>
          ) : subjects.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 mb-4">No subjects yet. Create your first subject to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/subjects/${subject.id}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{subject.title}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubject(subject.id);
                      }}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Created {subject.createdAt.toDate().toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
