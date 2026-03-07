import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  MantineProvider, 
  AppShell, 
  ActionIcon, 
  Text, 
  Group, 
  Flex, 
  Menu,
  Modal, 
  TextInput, 
  Textarea, 
  Select, 
  NumberInput, 
  MultiSelect, 
  Button, 
  Stack,
  SegmentedControl,
  UnstyledButton
} from '@mantine/core';
import { createTheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconSun, 
  IconMoon, 
  IconDashboard, 
  IconKey,
  IconPlus,
  IconFolder
} from '@tabler/icons-react';
import { TokenModal } from './components/TokenModal.jsx';
import { ProjectModal } from './components/ProjectModal.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { KanbanPage } from './pages/KanbanPage.jsx';
import { TaskGraphPage } from './pages/TaskGraphPage.jsx';
import { DeliverableKanbanPage } from './pages/DeliverableKanbanPage.jsx';
import { DeliverableListPage } from './pages/DeliverableListPage.jsx';
import { useTranslation } from './hooks/useTranslation.js';
import { useDeliverables } from './hooks/useDeliverables.js';
import logger from './utils/logger.js';
import '@mantine/core/styles.css';

function AppContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract projectCode from URL manually since useParams only works inside route components
  const projectCode = location.pathname.startsWith('/projects/') && 
    (location.pathname.includes('/kanban') || location.pathname.includes('/task-kanban') || 
     location.pathname.includes('/task-graph') || location.pathname.includes('/deliverables'))
    ? location.pathname.split('/')[2] 
    : null;
  
  const [colorScheme, setColorScheme] = useState('dark');
  const [accessToken, setAccessToken] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [projectModalOpened, setProjectModalOpened] = useState(false);
  const [editingProject, setEditingProject] = useState(null);  // null for create, project object for edit
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [createTaskModalOpened, setCreateTaskModalOpened] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState(null);
  const { deliverables } = useDeliverables(selectedProject);
  const [newTask, setNewTask] = useState({
    title: '',
    prompt: '',
    priority: 'MEDIUM',
    assigneeId: null,
    storyPoints: null,
    tags: []
  });


  // Load API translations and merge with static translations
  const loadApiTranslations = async (language) => {
    // Prevent loading if we already have the resource bundle and it's not empty
    if (i18n.hasResourceBundle(language, 'translation')) {
        // If it was already loaded, we might skip. However, standard react-i18next doesn't expose
        // easy way to check if it's "fully" loaded or just static. 
        // We'll rely on a simple module-level or component-level flag if needed,
        // but for now, checking if we have a flag in memory is better.
        // Let's use a simple state or ref check to avoid duplicate calls for same session.
    }

    const token = localStorage.getItem('TB_TOKEN');
    if (!token) {
      logger.debug('No token available, skipping API translation loading');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3030/translations/${language}`, {
        method: 'GET',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Merge API translations into i18n
        i18n.addResourceBundle(language, 'translation', data.translations, true, true);
        logger.debug(`Loaded ${language} translations from API`);
      } else {
        logger.warn(`Failed to load ${language} translations from API:`, response.status);
      }
    } catch (error) {
      logger.error(`Error loading ${language} translations from API:`, error);
    }
  };

  // Effect to load translations when language or token changes
  useEffect(() => {
    if (accessToken) {
        const currentLang = i18n.language.split('-')[0];
        loadApiTranslations(currentLang);
    }
    
    const handleLanguageChanged = (lng) => {
        if (accessToken) {
            const langCode = lng.split('-')[0];
            loadApiTranslations(langCode);
        }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
        i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [accessToken, i18n]);

  // Fetch projects with a specific token
  const fetchProjectsWithToken = async (token) => {
    if (!token) {
      console.error('No access token provided');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3030/projects', {
        method: 'GET',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        // Debug info
        logger.debug('Token: Set');
        logger.debug('localStorage: Has token');
        logger.debug('Projects:', data.length);
        logger.debug('TEST navigator:', navigator);
        logger.debug('TEST navigator.language:', navigator.language);
        logger.debug('BROWSER LOCALE:', navigator.language);
      } else {
        const errorText = await response.text();
        logger.error('Failed to fetch projects:', response.status, errorText);
      }
    } catch (error) {
      logger.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
    
    // Fetch current user
    try {
      const response = await fetch('http://localhost:3030/users/me', {
        method: 'GET',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
      }
    } catch (error) {
      logger.error('Error fetching current user:', error);
    }
  };

  useEffect(() => {
    // Check for saved theme preference, default to dark
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setColorScheme(savedTheme);
    }

    // Check for saved access token
    const savedToken = localStorage.getItem('TB_TOKEN');
    if (savedToken) {
      setAccessToken(savedToken);
      // Auto-load projects and translations if token exists
      fetchProjectsWithToken(savedToken);
      // Load users for project leader selection
      fetchUsers(savedToken);
    }
    
    // Debug info on app load
    console.log('=== APP DEBUG ===');
    console.log('TEST: useEffect is running');
    console.log('Token:', savedToken ? 'Set' : 'Not set');
    console.log('localStorage:', savedToken ? 'Has token' : 'No token');
    console.log('URL:', window.location.pathname);
    console.log('isKanbanPage:', window.location.pathname.includes('/task-kanban'));
    console.log('selectedProject:', selectedProject?.title || 'null');
    console.log('projectCode:', projectCode || 'null');
    console.log('BROWSER LOCALE:', navigator.language);
    console.log('==================');
  }, []);

  // Reset graph deliverable scope when switching projects.
  useEffect(() => {
    setSelectedDeliverableId(null);
  }, [selectedProject?.id]);

  const toggleTheme = () => {
    const newTheme = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleSetToken = (token) => {
    setAccessToken(token);
    localStorage.setItem('TB_TOKEN', token);
    close();
    // Auto-load projects and users after setting token
    fetchProjectsWithToken(token);
    fetchUsers(token);
  };

  // Fetch users for project leader selection
  const fetchUsers = async (token) => {
    try {
      const response = await fetch('http://localhost:3030/users', {
        method: 'GET',
        headers: {
          'TB_TOKEN': token || accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    navigate(`/projects/${project.code}/kanban`);
  };

  const handleProjectCreate = () => {
    setEditingProject(null);
    setProjectModalOpened(true);
  };

  const handleProjectEdit = (project) => {
    setEditingProject(project);
    setProjectModalOpened(true);
  };

  const handleProjectSave = async (formData) => {
    const token = localStorage.getItem('TB_TOKEN');
    if (!token) {
      throw new Error('No access token found');
    }

    try {
      if (editingProject) {
        // Edit mode - update project details and workflow separately
        // First update project details
        const projectResponse = await fetch(`http://localhost:3030/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description
          })
        });

        if (!projectResponse.ok) {
          const errorText = await projectResponse.text();
          throw new Error(`Failed to update project: ${errorText}`);
        }

        // Then update status workflow
        const workflowResponse = await fetch(`http://localhost:3030/projects/${editingProject.code}/statuses`, {
          method: 'PUT',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            statusWorkflow: formData.statusWorkflow
          })
        });

        if (!workflowResponse.ok) {
          const errorText = await workflowResponse.text();
          throw new Error(`Failed to update workflow: ${errorText}`);
        }
      } else {
        // Create mode - create project with workflow
        const createResponse = await fetch('http://localhost:3030/projects', {
          method: 'POST',
          headers: {
            'TB_TOKEN': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: formData.code,
            title: formData.title,
            description: formData.description,
            leaderId: formData.leaderId,
            statusWorkflow: formData.statusWorkflow
          })
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Failed to create project: ${errorText}`);
        }
      }

      // Refresh projects list
      await fetchProjectsWithToken(token);
      setProjectModalOpened(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  };

  const handleCreateTask = () => {
    setCreateTaskModalOpened(true);
  };

  const handleCreateTaskSubmit = async () => {
    // Robust project finding
    let targetProject = selectedProject;
    if (!targetProject && projectCode && projects.length > 0) {
      targetProject = projects.find(p => p.code === projectCode);
    }

    if (!newTask.title || !targetProject) {
      logger.error('Missing title or project', { title: newTask.title, project: targetProject });
      return;
    }

    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) return;

      // Determine initial status from project workflow (first column)
      const initialStatus = targetProject.statusWorkflow && targetProject.statusWorkflow.length > 0
        ? targetProject.statusWorkflow[0]
        : 'TO_DO';


      // Map tags to tagNames array for API
      const tagNames = newTask.tags;

      const deliverablesResponse = await fetch(`http://localhost:3030/projects/${targetProject.id}/deliverables`, {
        method: 'GET',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        }
      });
      if (!deliverablesResponse.ok) {
        logger.error('Failed to fetch deliverables for task creation:', deliverablesResponse.status);
        return;
      }
      const deliverables = await deliverablesResponse.json();
      if (!Array.isArray(deliverables) || deliverables.length === 0) {
        logger.error('Cannot create task without at least one deliverable');
        return;
      }

      const response = await fetch('http://localhost:3030/tasks', {
        method: 'POST',
        headers: {
          'TB_TOKEN': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTask.title,
          prompt: newTask.prompt,
          priority: newTask.priority,
          storyPoints: newTask.storyPoints ? parseInt(newTask.storyPoints) : null,
          projectId: targetProject.id,
          deliverableId: deliverables[0].id,
          status: initialStatus,
          assigneeId: newTask.assigneeId ? parseInt(newTask.assigneeId) : null,
          tagNames: tagNames
        })
      });

      if (response.ok) {
        setCreateTaskModalOpened(false);
        setNewTask({
          title: '',
          prompt: '',
          priority: 'MEDIUM',
          assigneeId: null,
          storyPoints: null,
          tags: []
        });
        
        // Trigger refresh
        setRefreshTrigger(prev => prev + 1);
        
      } else {
        logger.error('Failed to create task:', response.status);
      }
    } catch (error) {
      logger.error('Error creating task:', error);
    }
  };

  // Load project from URL if projectCode is present
  useEffect(() => {
    if (projectCode) {
      if (projects.length > 0) {
        const project = projects.find(p => p.code === projectCode);
        if (project) {
          setSelectedProject(project);
        } else {
          // Project not found, redirect to home
          logger.debug('Project not found, redirecting to home');
          navigate('/');
        }
      }
      // If projects aren't loaded yet, we'll wait for them to load
      // The useEffect will run again when projects are loaded
    }
  }, [projectCode, projects, navigate]);

  // Keyboard shortcut for creating new task (Ctrl/Cmd + N) - only on task views
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'n' && (location.pathname.includes('/task-kanban') || location.pathname.includes('/task-graph'))) {
        event.preventDefault();
        setCreateTaskModalOpened(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname]);

  const handleBackToProjects = () => {
    setSelectedProject(null);
    navigate('/projects');
  };

  const theme = createTheme({
    // You can customize theme here if needed
  });

  // Determine current view from location
  const isKanbanPage = location.pathname.includes('/kanban') && !location.pathname.includes('/task-kanban');
  const isTaskKanbanPage = location.pathname.includes('/task-kanban');
  const isTaskGraphPage = location.pathname.includes('/task-graph');
  const isDeliverablesPage = location.pathname.includes('/deliverables');
  const isProjectPage = isKanbanPage || isTaskKanbanPage || isTaskGraphPage || isDeliverablesPage;

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark" forceColorScheme={colorScheme}>
      <AppShell padding={0}>
        {/* Header with Zazz Board menu and navigation */}
        <AppShell.Header p="md">
          <Flex justify="space-between" align="center" style={{ height: '100%' }}>
            {/* Left: Zazz Board Logo (clickable menu) and Project Button */}
            <Group gap="xs" style={{ flexShrink: 0 }}>
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <UnstyledButton
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'background-color 200ms ease',
                      '&:hover': {
                        backgroundColor: 'var(--mantine-color-dark-6)'
                      }
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--mantine-color-dark-6)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <IconDashboard size={24} stroke={1.5} />
                    <Text size="lg" fw={700}>Zazz Board</Text>
                  </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>{t('common.settings')}</Menu.Label>
                  <Menu.Item 
                    leftSection={<IconKey size={14} />}
                    onClick={open}
                  >
                    {t('common.setAccessToken')}
                  </Menu.Item>
                  
                  {(isTaskKanbanPage || isTaskGraphPage) && (
                    <>
                      <Menu.Divider />
                      <Menu.Label>{t('kanban.title')}</Menu.Label>
                      <Menu.Item 
                        leftSection={<IconPlus size={14} />}
                        onClick={handleCreateTask}
                        title={`${t('common.keyboardShortcut')}: Ctrl+N / Cmd+N`}
                      >
                        {t('tasks.createTask')}
                      </Menu.Item>
                    </>
                  )}
                </Menu.Dropdown>
              </Menu>
              
              {/* Project Button - only show on project detail pages */}
              {isProjectPage && selectedProject && (
                <UnstyledButton
                  onClick={handleBackToProjects}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    backgroundColor: 'var(--mantine-color-blue-9)',
                    transition: 'all 200ms ease',
                    border: '1px solid var(--mantine-color-blue-7)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-blue-8)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-blue-9)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <IconFolder size={18} color="var(--mantine-color-blue-2)" />
                  <Text size="sm" fw={600} c="blue.2">
                    Projects
                  </Text>
                </UnstyledButton>
              )}
            </Group>
            
            {/* Center: Project Title or Deliverable Filter */}
            {isProjectPage && selectedProject && (
              isTaskGraphPage ? (
                <Select
                  placeholder="Select deliverable"
                  data={deliverables.map(d => ({ value: String(d.id), label: d.name }))}
                  value={selectedDeliverableId ?? ''}
                  onChange={(val) => setSelectedDeliverableId(val || null)}
                  size="sm"
                  style={{ minWidth: 240 }}
                  withCheckIcon={false}
                  clearable
                />
              ) : (
                <Text
                  size="md"
                  fw={500}
                  c="dimmed"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    maxWidth: '300px',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    margin: '0 auto'
                  }}
                  title={selectedProject.title}
                >
                  {selectedProject.title}
                </Text>
              )
            )}
            
            {/* Right: Navigation and Theme Toggle */}
            <Group gap="sm" style={{ flexShrink: 0 }}>
              {isProjectPage && (
                <SegmentedControl
                  size="sm"
                  value={isTaskGraphPage ? 'task-graph' : isDeliverablesPage ? 'deliverables' : isTaskKanbanPage ? 'task-kanban' : 'kanban'}
                  onChange={(value) => {
                    if (projectCode) {
                      const routeMap = {
                        'kanban': '/kanban',
                        'task-kanban': '/task-kanban',
                        'task-graph': '/task-graph',
                        'deliverables': '/deliverables'
                      };
                      navigate(`/projects/${projectCode}${routeMap[value]}`);
                    }
                  }}
                  data={[
                    { value: 'kanban', label: 'Kanban' },
                    { value: 'task-kanban', label: 'Task Kanban' },
                    { value: 'task-graph', label: 'Graph' },
                    { value: 'deliverables', label: 'Deliverables' },
                  ]}
                />
              )}
              <ActionIcon 
                onClick={toggleTheme}
                variant="light"
                size="lg"
                aria-label="Toggle theme"
              >
                {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
              </ActionIcon>
            </Group>
          </Flex>
        </AppShell.Header>

        {/* Main content */}
        <AppShell.Main pt="md">
          <Routes>
            <Route path="/" element={
              <Navigate to="/projects" replace />
            } />
            <Route path="/projects" element={
              <HomePage 
                projects={projects}
                loading={loading}
                accessToken={accessToken}
                currentUser={currentUser}
                onProjectSelect={handleProjectSelect}
                onProjectEdit={handleProjectEdit}
                onProjectCreate={handleProjectCreate}
              />
            } />
            <Route path="/projects/:projectCode/kanban" element={
              <DeliverableKanbanPage 
                selectedProject={selectedProject}
              />
            } />
            <Route path="/projects/:projectCode/task-kanban" element={
              <KanbanPage 
                selectedProject={selectedProject}
                onBackToProjects={handleBackToProjects}
                refreshTrigger={refreshTrigger}
              />
            } />
            <Route path="/projects/:projectCode/task-graph" element={
              <TaskGraphPage
                selectedProject={selectedProject}
                selectedDeliverableId={selectedDeliverableId}
              />
            } />
            <Route path="/projects/:projectCode/deliverables" element={
              <DeliverableListPage 
                selectedProject={selectedProject}
              />
            } />
            <Route path="/projects/:projectCode/deliverable-kanban" element={
              <DeliverableKanbanPage 
                selectedProject={selectedProject}
              />
            } />
          </Routes>
        </AppShell.Main>
      </AppShell>

      {/* Token Modal */}
      <TokenModal 
        opened={opened} 
        onClose={close} 
        onSetToken={handleSetToken} 
      />

      {/* Project Modal */}
      {projectModalOpened && (
        <ProjectModal
          opened={projectModalOpened}
          onClose={() => {
            setProjectModalOpened(false);
            setEditingProject(null);
          }}
          onSave={handleProjectSave}
          project={editingProject}
          users={users}
          currentUser={currentUser}
        />
      )}

      {/* Create Task Modal */}
      <Modal 
        opened={createTaskModalOpened} 
        onClose={() => setCreateTaskModalOpened(false)}
        title={t('tasks.createTask')}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreateTaskSubmit(); }}>
          <Stack gap="md">
            <TextInput
              label={t('tasks.title')}
              placeholder={t('tasks.title')}
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              required
              data-autofocus
            />
            
            <Textarea
              label={t('tasks.prompt')}
              placeholder={t('tasks.prompt')}
              value={newTask.prompt}
              onChange={(e) => setNewTask({ ...newTask, prompt: e.target.value })}
              rows={3}
            />
            
            <Select
              label={t('tasks.priority')}
              data={[
                { value: 'LOW', label: t('tasks.priorities.LOW') },
                { value: 'MEDIUM', label: t('tasks.priorities.MEDIUM') },
                { value: 'HIGH', label: t('tasks.priorities.HIGH') },
                { value: 'CRITICAL', label: t('tasks.priorities.CRITICAL') }
              ]}
              value={newTask.priority}
              onChange={(value) => setNewTask({ ...newTask, priority: value })}
            />
            
            <NumberInput
              label={t('tasks.storyPoints')}
              placeholder={t('tasks.storyPoints')}
              value={newTask.storyPoints}
              onChange={(value) => setNewTask({ ...newTask, storyPoints: value })}
              min={1}
              max={21}
            />
            
            <MultiSelect
              label="Tags"
              placeholder="Tags"
              data={[
                { value: 'setup', label: 'setup' },
                { value: 'configuration', label: 'configuration' },
                { value: 'database', label: 'database' },
                { value: 'design', label: 'design' },
                { value: 'auth', label: 'auth' },
                { value: 'security', label: 'security' },
                { value: 'documentation', label: 'documentation' },
                { value: 'api', label: 'api' }
              ]}
              value={newTask.tags}
              onChange={(value) => setNewTask({ ...newTask, tags: value })}
              searchable
              creatable
              getCreateLabel={(query) => `+ Create ${query}`}
              onCreate={(query) => {
                // When a new tag is created, we need to add it to the state
                // The MultiSelect will handle the display, but we should probably 
                // handle the creation logic if needed, or just let the API handle it on submit
                return { value: query, label: query };
              }}
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setCreateTaskModalOpened(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('tasks.createTask')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

    </MantineProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
