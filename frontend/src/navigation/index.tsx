import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import InsightViewScreen from "../screens/InsightViewScreen";
import MyLifeScreen from "../screens/MyLifeScreen";
import ActionDetailScreen from "../screens/ActionDetailScreen";
import OnboardingScreen, { ONBOARDING_KEY } from "../screens/OnboardingScreen";
import { RootStackParamList } from "../types";

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((done) => {
        setInitialRoute(done ? "Main" : "Onboarding");
      })
      .catch(() => {
        setInitialRoute("Main");
      });
  }, []);

  if (!initialRoute) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={InsightViewScreen} />
        <Stack.Screen name="MyLife" component={MyLifeScreen} />
        <Stack.Screen name="ActionDetail" component={ActionDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
