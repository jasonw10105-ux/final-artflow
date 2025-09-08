import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { format, isSameDay, parseISO, startOfWeek, endOfWeek, addDays, getWeek } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Send, Bell, Tag, MessageSquare, Briefcase, BookCopy, XCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { AppContact, TagRow } from '@/types/app-specific.types';

import '@/styles/app.css';

// --- TYPES FOR CALENDAR EVENTS ---
interface Task {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    due_date: string; // ISO string
    status: 'pending' | 'completed' | 'overdue';
    related_entity: 'artwork' | 'contact' | 'catalogue' | null;
    related_id: string | null;
    contact_id: string | null; // For follow-ups
    created_at: string;
}

interface CatalogueSchedule {
    id: string;
    title: string;
    scheduled_send_at: string; // ISO string
    slug: string | null;
    is_published: boolean;
}

type CalendarEvent = Task | CatalogueSchedule; // Union type

// Type guard to distinguish between Task and CatalogueSchedule
const isTask = (event: CalendarEvent): event is Task => (event as Task).status !== undefined;
const isCatalogueSchedule = (event: CalendarEvent): event is CatalogueSchedule => (event as CatalogueSchedule).scheduled_send_at !== undefined && (event as CatalogueSchedule).title !== undefined && (event as CatalogueSchedule).id !== undefined;


// --- DATA FETCHING FUNCTIONS ---
const fetchTasks = async (userId: string): Promise<Task[]> => {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });
    if (error) throw error;
    return data as Task[] || [];
};

const fetchCatalogueSchedules = async (userId: string): Promise<CatalogueSchedule[]> => {
    const { data, error } = await supabase
        .from('catalogues')
        .select('id, title, scheduled_send_at, slug, is_published')
        .eq('user_id', userId)
        .not('scheduled_send_at', 'is', null) // Only fetch scheduled ones
        .order('scheduled_send_at', { ascending: true });
    if (error) throw error;
    return data as CatalogueSchedule[] || [];
};

const fetchContacts = async (userId: string): Promise<AppContact[]> => {
    const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, email')
        .eq('user_id', userId)
        .order('full_name', { ascending: true });
    if (error) throw error;
    return data as AppContact[] || [];
};

// --- TaskFormModal Component ---
interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<Task>) => void;
    userId: string;
    initialDate?: Date; // For pre-filling the due date
    contacts: AppContact[]; // Pass available contacts
    editingTask?: Task | null; // For editing existing tasks
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSave, userId, initialDate, contacts, editingTask }) => {
    const [title, setTitle] = useState(editingTask?.title || '');
    const [description, setDescription] = useState(editingTask?.description || '');
    const [dueDate, setDueDate] = useState(editingTask?.due_date ? format(parseISO(editingTask.due_date), 'yyyy-MM-dd') : (initialDate ? format(initialDate, 'yyyy-MM-dd') : ''));
    const [dueTime, setDueTime] = useState(editingTask?.due_date ? format(parseISO(editingTask.due_date), 'HH:mm') : '09:00');
    const [status, setStatus] = useState<'pending' | 'completed' | 'overdue'>(editingTask?.status || 'pending');
    const [relatedContactId, setRelatedContactId] = useState<string | null>(editingTask?.contact_id || null);

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (editingTask) {
            setTitle(editingTask.title);
            setDescription(editingTask.description || '');
            setDueDate(format(parseISO(editingTask.due_date), 'yyyy-MM-dd'));
            setDueTime(format(parseISO(editingTask.due_date), 'HH:mm'));
            setStatus(editingTask.status);
            setRelatedContactId(editingTask.contact_id);
        } else if (initialDate) {
            setTitle('');
            setDescription('');
            setDueDate(format(initialDate, 'yyyy-MM-dd'));
            setDueTime('09:00');
            setStatus('pending');
            setRelatedContactId(null);
        }
    }, [editingTask, initialDate]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!title.trim()) newErrors.title = 'Title is required.';
        if (!dueDate) newErrors.dueDate = 'Due date is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const combinedDateTime = `${dueDate}T${dueTime}:00`;
        const taskToSave: Partial<Task> = {
            title: title.trim(),
            description: description.trim() || null,
            due_date: parseISO(combinedDateTime).toISOString(), // Ensure ISO string for Supabase
            status: status,
            contact_id: relatedContactId,
            user_id: userId, // Ensure user_id is set
        };
        if (editingTask) taskToSave.id = editingTask.id; // Include ID for updates
        onSave(taskToSave);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content modal-task-form">
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h3>{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                        <button type="button" onClick={onClose} className="button-icon"><XCircle size={20} /></button>
                    </div>
                    <div className="modal-body space-y-4">
                        <div className="form-group">
                            <label htmlFor="task-title" className="label">Task Title</label>
                            <input
                                id="task-title"
                                type="text"
                                value={title}
                                onChange={(e) => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: '' })); }}
                                className={`input ${errors.title ? 'input-error' : ''}`}
                                required
                            />
                            {errors.title && <p className="error-message">{errors.title}</p>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-description" className="label">Description (Optional)</label>
                            <textarea
                                id="task-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="textarea min-h-[80px]"
                            />
                        </div>
                        <div className="form-grid-2-col">
                            <div className="form-group">
                                <label htmlFor="task-due-date" className="label">Due Date</label>
                                <input
                                    id="task-due-date"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => { setDueDate(e.target.value); setErrors(prev => ({ ...prev, dueDate: '' })); }}
                                    className={`input ${errors.dueDate ? 'input-error' : ''}`}
                                    required
                                />
                                {errors.dueDate && <p className="error-message">{errors.dueDate}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="task-due-time" className="label">Due Time</label>
                                <input
                                    id="task-due-time"
                                    type="time"
                                    value={dueTime}
                                    onChange={(e) => setDueTime(e.target.value)}
                                    className="input"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-status" className="label">Status</label>
                            <select
                                id="task-status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as 'pending' | 'completed' | 'overdue')}
                                className="input"
                            >
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="overdue">Overdue</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="related-contact" className="label">Related Contact (Optional)</label>
                            <select
                                id="related-contact"
                                value={relatedContactId || ''}
                                onChange={(e) => setRelatedContactId(e.target.value || null)}
                                className="input"
                            >
                                <option value="">-- Select Contact --</option>
                                {contacts.map(contact => (
                                    <option key={contact.id} value={contact.id}>{contact.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="button button-primary">{editingTask ? 'Save Changes' : 'Create Task'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- MAIN CALENDAR PAGE COMPONENT ---
const ArtistCalendarPage = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const location = useLocation();
    const navigate = useNavigate();

    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Week starts on Monday
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [initialTaskDate, setInitialTaskDate] = useState<Date | undefined>(undefined);
    const [editingTask, setEditingTask] = useState<Task | null>(null); // State to hold task being edited

    const { data: tasks, isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[], Error>({
        queryKey: ['tasks', user?.id],
        queryFn: () => fetchTasks(user!.id),
        enabled: !!user,
    });

    const { data: catalogueSchedules, isLoading: isLoadingSchedules, error: schedulesError } = useQuery<CatalogueSchedule[], Error>({
        queryKey: ['catalogueSchedules', user?.id],
        queryFn: () => fetchCatalogueSchedules(user!.id),
        enabled: !!user,
    });

    const { data: contacts, isLoading: isLoadingContacts, error: contactsError } = useQuery<AppContact[], Error>({
        queryKey: ['contacts', user?.id],
        queryFn: () => fetchContacts(user!.id),
        enabled: !!user,
    });

    // Check URL for `action=newTask` and `date` params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'newTask') {
            const dateParam = params.get('date');
            if (dateParam) {
                setInitialTaskDate(parseISO(dateParam));
            } else {
                setInitialTaskDate(new Date());
            }
            setShowTaskModal(true);
            navigate(location.pathname, { replace: true }); // Clear query params
        }
    }, [location.search, location.pathname, navigate]);


    // Group all events by date
    const eventsByDate = useMemo(() => {
        const allEvents: CalendarEvent[] = [];
        if (tasks) allEvents.push(...tasks);
        if (catalogueSchedules) allEvents.push(...catalogueSchedules);

        const grouped = new Map<string, CalendarEvent[]>(); // key: 'yyyy-MM-dd'

        allEvents.forEach(event => {
            let eventDate: Date;
            if (isTask(event)) {
                eventDate = parseISO(event.due_date);
            } else if (isCatalogueSchedule(event)) {
                eventDate = parseISO(event.scheduled_send_at);
            } else {
                return; // Should not happen with type guards
            }
            const dateKey = format(eventDate, 'yyyy-MM-dd');
            if (!grouped.has(dateKey)) {
                grouped.set(dateKey, []);
            }
            grouped.get(dateKey)?.push(event);
        });

        // Sort events within each day by time
        grouped.forEach((events, dateKey) => {
            events.sort((a, b) => {
                let timeA: Date;
                let timeB: Date;
                if (isTask(a)) timeA = parseISO(a.due_date);
                else if (isCatalogueSchedule(a)) timeA = parseISO(a.scheduled_send_at);
                else return 0; // Fallback

                if (isTask(b)) timeB = parseISO(b.due_date);
                else if (isCatalogueSchedule(b)) timeB = parseISO(b.scheduled_send_at);
                else return 0; // Fallback

                return timeA.getTime() - timeB.getTime();
            });
        });

        return grouped;
    }, [tasks, catalogueSchedules]);

    // Create the dates for the current week display
    const daysOfWeek = useMemo(() => {
        const days = [];
        let day = currentWeekStart;
        for (let i = 0; i < 7; i++) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentWeekStart]);

    // Navigation for weeks
    const goToPreviousWeek = () => {
        setCurrentWeekStart(prev => addDays(prev, -7));
    };

    const goToNextWeek = () => {
        setCurrentWeekStart(prev => addDays(prev, 7));
    };

    const goToToday = () => {
        setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    };

    // --- MUTATIONS ---
    const addTaskMutation = useMutation({
        mutationFn: async (newTask: Partial<Task>) => {
            const { error } = await supabase.from('tasks').insert(newTask);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Task created successfully!");
            queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
        },
        onError: (err: any) => toast.error(`Failed to create task: ${err.message}`),
    });

    const updateTaskMutation = useMutation({
        mutationFn: async (updatedTask: Partial<Task>) => {
            if (!updatedTask.id) throw new Error("Task ID is required for update.");
            const { error } = await supabase.from('tasks').update(updatedTask).eq('id', updatedTask.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Task updated successfully!");
            queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
        },
        onError: (err: any) => toast.error(`Failed to update task: ${err.message}`),
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (taskId: string) => {
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Task deleted successfully!");
            queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
        },
        onError: (err: any) => toast.error(`Failed to delete task: ${err.message}`),
    });

    const handleSaveTask = (taskData: Partial<Task>) => {
        if (taskData.id) {
            updateTaskMutation.mutate(taskData);
        } else {
            addTaskMutation.mutate(taskData);
        }
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setInitialTaskDate(parseISO(task.due_date)); // Set date for modal if it's new
        setShowTaskModal(true);
    };

    const handleAddTaskClick = (date?: Date) => {
        setEditingTask(null); // Clear any editing task
        setInitialTaskDate(date || new Date());
        setShowTaskModal(true);
    };

    // Loading State
    if (isLoadingTasks || isLoadingSchedules || isLoadingContacts) {
        return <div className="page-container"><p className="loading-message">Loading calendar data...</p></div>;
    }
    // Error State
    if (tasksError || schedulesError || contactsError) {
        return (
            <div className="page-container">
                <p className="error-message">Error loading calendar: {tasksError?.message || schedulesError?.message || contactsError?.message}</p>
            </div>
        );
    }

    return (
        <div className="page-container calendar-page">
            <h1 className="page-title">My Calendar & Tasks</h1>
            <p className="page-subtitle">Visualize your catalogue schedules, collector follow-ups, and other important tasks.</p>

            {/* Task Form Modal */}
            {showTaskModal && (
                <TaskFormModal
                    isOpen={showTaskModal}
                    onClose={() => setShowTaskModal(false)}
                    onSave={handleSaveTask}
                    userId={user!.id}
                    initialDate={initialTaskDate}
                    contacts={contacts || []}
                    editingTask={editingTask}
                />
            )}

            {/* Calendar Navigation */}
            <div className="calendar-nav-bar">
                <button onClick={goToPreviousWeek} className="button button-secondary">
                    <ArrowLeft size={16} /> Prev
                </button>
                <h2 className="calendar-current-week">
                    Week {getWeek(currentWeekStart, { weekStartsOn: 1 })} - {format(currentWeekStart, 'MMM dd, yyyy')} to {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM dd, yyyy')}
                </h2>
                <button onClick={goToNextWeek} className="button button-secondary">
                    Next <ArrowLeft size={16} className="rotate-180" />
                </button>
                <button onClick={goToToday} className="button button-primary ml-4">
                    Today
                </button>
                <button onClick={() => handleAddTaskClick()} className="button button-secondary button-with-icon ml-auto">
                    <Plus size={16} /> Add Task
                </button>
            </div>

            {/* Week View */}
            <div className="calendar-week-grid">
                {daysOfWeek.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDate.get(dateKey) || [];
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div key={dateKey} className={`calendar-day ${isToday ? 'today' : ''}`}>
                            <div className="day-header">
                                <span className="day-of-week">{format(day, 'EEE')}</span>
                                <span className="day-number">{format(day, 'dd')}</span>
                                <button onClick={() => handleAddTaskClick(day)} className="button-icon-secondary button-sm ml-auto" title="Add task to this day">
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="day-events">
                                {dayEvents.length > 0 ? (
                                    dayEvents.map(event => (
                                        <div key={event.id} className="event-item">
                                            {isTask(event) ? (
                                                <div className={`task-event ${event.status}`}>
                                                    <div className="flex items-center gap-2">
                                                        {event.status === 'completed' ? <CheckCircle size={16} className="text-green-500" /> : <Bell size={16} />}
                                                        <span className="font-semibold">{event.title}</span>
                                                    </div>
                                                    <span className="event-time">{format(parseISO(event.due_date), 'HH:mm')}</span>
                                                    {event.contact_id && (
                                                        <span className="event-contact-link">
                                                            <MessageSquare size={12} /> {contacts?.find(c => c.id === event.contact_id)?.full_name || 'Contact'}
                                                        </span>
                                                    )}
                                                    <div className="task-actions">
                                                        <button onClick={() => handleEditTask(event)} className="button-icon-secondary button-sm" title="Edit Task"><Briefcase size={14} /></button>
                                                        <button onClick={() => deleteTaskMutation.mutate(event.id)} className="button-icon-danger button-sm" title="Delete Task"><XCircle size={14} /></button>
                                                    </div>
                                                </div>
                                            ) : isCatalogueSchedule(event) ? (
                                                <div className="catalogue-event">
                                                    <BookCopy size={16} />
                                                    <span className="font-semibold">{event.title}</span>
                                                    <span className="event-time">{format(parseISO(event.scheduled_send_at), 'HH:mm')}</span>
                                                    <span className="event-type-badge">(Scheduled Send)</span>
                                                    <Link to={`/u/catalogues/edit/${event.id}`} className="button-icon-secondary button-sm ml-auto" title="Edit Catalogue">
                                                        <Briefcase size={14} />
                                                    </Link>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-sm">No events</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ArtistCalendarPage;