import { Tabs } from 'expo-router';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

type IconName = 'discover' | 'decide' | 'friends' | 'groups' | 'profile';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const color = focused ? Colors.accent.coral : Colors.text.secondary;
  const size = 24;

  const renderIcon = () => {
    switch (name) {
      case 'discover':
        return <Ionicons name="compass" size={size} color={color} />;
      case 'decide':
        return <MaterialCommunityIcons name="vote" size={size} color={color} />;
      case 'friends':
        return <FontAwesome5 name="user-friends" size={size - 2} color={color} />;
      case 'groups':
        return <MaterialCommunityIcons name="account-group" size={size} color={color} />;
      case 'profile':
        return <Ionicons name="person" size={size} color={color} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.tabIconContainer}>
      {renderIcon()}
    </View>
  );
}

function HeaderWithLogo({ title }: { title: string }) {
  return (
    <View style={styles.headerContainer}>
      <Image 
        source={require('../../assets/icon.png')} 
        style={styles.headerLogo} 
      />
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.background.secondary,
          borderTopColor: Colors.border,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: Colors.accent.coral,
        tabBarInactiveTintColor: Colors.text.secondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: Colors.background.primary,
        },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => <TabIcon name="discover" focused={focused} />,
          headerTitle: () => <HeaderWithLogo title="LMK" />,
        }}
      />
      <Tabs.Screen
        name="decide"
        options={{
          title: 'Decide',
          tabBarIcon: ({ focused }) => <TabIcon name="decide" focused={focused} />,
          headerTitle: () => <HeaderWithLogo title="Decide" />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ focused }) => <TabIcon name="friends" focused={focused} />,
          headerTitle: () => <HeaderWithLogo title="Friends" />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ focused }) => <TabIcon name="groups" focused={focused} />,
          headerTitle: () => <HeaderWithLogo title="Groups" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
          headerTitle: () => <HeaderWithLogo title="Profile" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
});
