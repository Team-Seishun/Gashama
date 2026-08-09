import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string; // Used to display the selected filter name
  onPress: () => void;
  onClear?: () => void;
  placeholder?: string;
}

export default function SearchBar({ value, onPress, onClear, placeholder = "検索キーワードを入力..." }: SearchBarProps) {
  return (
    <TouchableOpacity style={styles.searchBar} activeOpacity={0.8} onPress={onPress}>
      <Ionicons name="search" size={20} color="#999" />
      <View style={styles.inputContainer}>
        <Text style={[styles.text, !value && styles.placeholderText]} numberOfLines={1}>
          {value || placeholder}
        </Text>
      </View>
      {value && onClear ? (
        <TouchableOpacity style={styles.clearButton} onPress={onClear}>
          <Ionicons name="close-circle" size={20} color="#999" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
  },
  inputContainer: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  clearButton: {
    padding: 4,
  },
});
