'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import {
  getSubjects,
  getNotes,
  createNote,
  deleteNote,
  Note,
  Subject,
} from '@/lib/db';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import { GenerateQuizButton } from '@/components/GenerateQuizButton';
import { extractTextFromFile } from '@/lib/fileParser';
import toast from 'react-hot-toast';

export default function SubjectPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const router = useRouter();
  const params = useParams();
  const subjectId = params.id as string;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user && subjectId) {
        loadData(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [subjectId]);

  const loadData = async (uid: string) => {
    try {
      const subjects = await getSubjects(uid);
      const foundSubject = subjects.find((s) => s.id === subjectId);
      if (!foundSubject) {
        toast.error('Subject not found');
        router.push('/dashboard');
        return;
      }
      setSubject(foundSubject);

      const notesData = await getNotes(subjectId, uid);
      setNotes(notesData);
    } catch (error: any) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setParsingFile(true);
    try {
      const extractedText = await extractTextFromFile(file);
      setNoteContent(extractedText);
      if (!noteTitle.trim()) {
        // Auto-fill title from filename
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        setNoteTitle(fileName);
      }
      setUploadedFile(file);
      toast.success('File parsed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse file');
      console.error(error);
    } finally {
      setParsingFile(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !noteTitle.trim() || !noteContent.trim()) return;

    setCreating(true);
    try {
      await createNote(user.uid, subjectId, noteTitle.trim(), noteContent.trim());
      setNoteTitle('');
      setNoteContent('');
      setUploadedFile(null);
      setShowNoteForm(false);
      if (user) {
        const notesData = await getNotes(subjectId, user.uid);
        setNotes(notesData);
      }
      toast.success('Note created successfully!');
    } catch (error: any) {
      console.error('Error creating note:', error);
      toast.error(error.message || 'Failed to create note. Check console for details.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteNote(noteId);
      if (user) {
        const notesData = await getNotes(subjectId, user.uid);
        setNotes(notesData);
      }
      toast.success('Note deleted successfully!');
    } catch (error: any) {
      toast.error('Failed to delete note');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar user={user} />
          <div className="text-center py-12">Loading...</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:text-blue-700 mb-4"
            >
              ← Back to Dashboard
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{subject?.title}</h2>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => router.push(`/chat/${subjectId}`)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              AI Chat
            </button>
            <GenerateQuizButton subjectId={subjectId} userId={user?.uid || ''} />
          </div>

          <div className="mb-6">
            <button
              onClick={() => setShowNoteForm(!showNoteForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {showNoteForm ? 'Cancel' : '+ New Note'}
            </button>
          </div>

          {showNoteForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <form onSubmit={handleCreateNote}>
                <div className="mb-4">
                  <label htmlFor="noteTitle" className="block text-sm font-medium text-gray-700 mb-2">
                    Note Title
                  </label>
                  <input
                    id="noteTitle"
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Enter note title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="fileUpload" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload PDF or Word Document (Optional)
                  </label>
                  <input
                    id="fileUpload"
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                    disabled={parsingFile}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  {parsingFile && (
                    <p className="mt-2 text-sm text-gray-500">Parsing file...</p>
                  )}
                  {uploadedFile && !parsingFile && (
                    <p className="mt-2 text-sm text-green-600">
                      ✓ {uploadedFile.name} parsed successfully
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="noteContent" className="block text-sm font-medium text-gray-700 mb-2">
                    Content {uploadedFile && <span className="text-gray-500">(from {uploadedFile.name})</span>}
                  </label>
                  <textarea
                    id="noteContent"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter note content or upload a PDF/Word file"
                    required
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating || parsingFile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Note'}
                </button>
              </form>
            </div>
          )}

          {notes.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">No notes yet. Create your first note!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap mb-2">{note.content}</div>
                  <p className="text-sm text-gray-500">
                    Created {note.createdAt.toDate().toLocaleDateString()}
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
