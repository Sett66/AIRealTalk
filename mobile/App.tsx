import { useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Scenario, SessionReport } from '@airealtalk/shared';
import { ConversationScreen } from './src/screens/ConversationScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { SceneSelectScreen } from './src/screens/SceneSelectScreen';
import { savePracticeRecord } from './src/stores/history-store';

type AppRoute =
  | { name: 'home' }
  | { name: 'sceneSelect' }
  | { name: 'history' }
  | { name: 'conversation'; scenario: Scenario }
  | {
      name: 'report';
      report: SessionReport;
      scenarioTitle: string;
      returnTo: 'sceneSelect' | 'history';
    };

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [route, setRoute] = useState<AppRoute>({ name: 'home' });

  const handleReportReady = (report: SessionReport, scenarioTitle: string) => {
    void savePracticeRecord(report, scenarioTitle);
    setRoute((prev) => {
      if (prev.name === 'report' && prev.report.sessionId === report.sessionId) {
        return { ...prev, report };
      }
      return {
        name: 'report',
        report,
        scenarioTitle,
        returnTo: 'sceneSelect',
      };
    });
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {route.name === 'home' && (
        <HomeScreen
          onStartPractice={() => setRoute({ name: 'sceneSelect' })}
          onOpenHistory={() => setRoute({ name: 'history' })}
        />
      )}
      {route.name === 'history' && (
        <HistoryScreen
          onBack={() => setRoute({ name: 'home' })}
          onOpenReport={(report, scenarioTitle) =>
            setRoute({
              name: 'report',
              report,
              scenarioTitle,
              returnTo: 'history',
            })
          }
        />
      )}
      {route.name === 'sceneSelect' && (
        <SceneSelectScreen
          onBack={() => setRoute({ name: 'home' })}
          onSelectScenario={(scenario) =>
            setRoute({ name: 'conversation', scenario })
          }
        />
      )}
      {route.name === 'conversation' && (
        <ConversationScreen
          scenarioId={route.scenario.id}
          scenarioTitle={route.scenario.title}
          onBack={() => setRoute({ name: 'sceneSelect' })}
          onReportReady={(report) =>
            handleReportReady(report, route.scenario.title)
          }
          onReportUpdated={(report) =>
            handleReportReady(report, route.scenario.title)
          }
        />
      )}
      {route.name === 'report' && (
        <ReportScreen
          report={route.report}
          scenarioTitle={route.scenarioTitle}
          doneLabel={
            route.returnTo === 'history' ? '返回练习历史' : '返回场景选择'
          }
          onDone={() => {
            if (route.returnTo === 'history') {
              setRoute({ name: 'history' });
            } else {
              setRoute({ name: 'sceneSelect' });
            }
          }}
        />
      )}
    </SafeAreaProvider>
  );
}

export default App;
