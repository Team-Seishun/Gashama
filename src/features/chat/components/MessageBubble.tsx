import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type MessageBubbleProps = {
  text: string;
  time: string;
  isOwnMessage: boolean;
};

export function MessageBubble({ text, time, isOwnMessage }: MessageBubbleProps) {
  if (isOwnMessage) {
    return (
      <View style={[styles.messageRow, styles.messageRowRight]}>
        <Text style={[styles.timeText, { marginRight: 8 }]}>{time}</Text>
        <View style={styles.messageBubbleRight}>
          <Text style={styles.messageTextRight}>
            {text}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, styles.messageRowLeft]}>
      <View style={[styles.avatarPlaceholder, { backgroundColor: '#E1F5FE' }]}>
        <Ionicons name="person" size={16} color="#007AFF" />
      </View>
      <View style={styles.messageBubbleLeft}>
        <Text style={styles.messageTextLeft}>
          {text}
        </Text>
      </View>
      <Text style={styles.timeText}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubbleLeft: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    maxWidth: '70%',
    marginRight: 8,
  },
  messageBubbleRight: {
    backgroundColor: '#FF7A00',
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    maxWidth: '75%',
  },
  messageTextLeft: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  messageTextRight: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  timeText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
});
