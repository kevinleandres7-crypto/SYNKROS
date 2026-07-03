// navigation/AppNavigator.tsx
// Bottom tabs (Ahora / Agenda / Comando) + un stack para el modal de detalle de tarea.
// NowCardScreen es siempre la pantalla de entrada en cold start.

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/tokens';
import NowCardScreen from '../screens/NowCardScreen';
import FlujoLiquidoScreen from '../screens/FlujoLiquidoScreen';
import CentroComandoScreen from '../screens/CentroComandoScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  TaskDetailModal: { taskId: string };
};

export type MainTabsParamList = {
  Ahora: undefined;
  Agenda: undefined;
  Comando: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Ahora"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg.surface,
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          height: 64,
        },
        tabBarActiveTintColor: colors.ai.cyan,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tab.Screen name="Ahora" component={NowCardScreen} />
      <Tab.Screen name="Agenda" component={FlujoLiquidoScreen} />
      <Tab.Screen name="Comando" component={CentroComandoScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        {/*
          TaskDetailModal se implementa en el Módulo 3 (depende del engine de
          reorganización para mostrar impacto de mover una tarea). Se deja el
          slot de navegación reservado para no romper el contrato de rutas.
        */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
