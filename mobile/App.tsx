import { useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Scenario } from '@airealtalk/shared';
import { ConversationScreen } from './src/screens/ConversationScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SceneSelectScreen } from './src/screens/SceneSelectScreen';

type AppRoute =
  | { name: 'home' }
  | { name: 'sceneSelect' }
  | { name: 'conversation'; scenario: Scenario };

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [route, setRoute] = useState<AppRoute>({ name: 'home' });

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {route.name === 'home' && (
        <HomeScreen onStartPractice={() => setRoute({ name: 'sceneSelect' })} />
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
        />
      )}
    </SafeAreaProvider>
  );
}

export default App;
