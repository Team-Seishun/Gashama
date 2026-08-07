import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

type MessageBubbleProps = {
  text: string;
  time: string;
  isOwnMessage: boolean;
  isSystemMessage?: boolean;
  imageUrl?: string | null;
};

export function MessageBubble({ text, time, isOwnMessage, isSystemMessage, imageUrl }: MessageBubbleProps) {
  if (isSystemMessage) {
    const displayText = text.replace('【システムメッセージ】\n', '');
    return (
      <View style={styles.systemMessageContainer}>
        <View style={styles.systemMessageBubble}>
          <Ionicons name="information-circle" size={16} color="#666" style={{ marginRight: 6 }} />
          <Text style={styles.systemMessageText}>{displayText}</Text>
        </View>
        <Text style={styles.systemTimeText}>{time}</Text>
      </View>
    );
  }

  if (isOwnMessage) {
    return (
      <View style={[styles.messageRow, styles.messageRowRight]}>
        <Text style={[styles.timeText, { marginRight: 8 }]}>{time}</Text>
        <View style={[styles.messageBubbleRight, imageUrl ? { backgroundColor: 'transparent', padding: 0 } : null]}>
          {imageUrl && (
            <Image source={{ uri: imageUrl }} style={styles.messageImage} contentFit="contain" />
          )}
          {text ? (
            <View style={imageUrl ? [styles.messageBubbleRight, { marginTop: 4 }] : null}>
              <Text style={styles.messageTextRight}>
                {text}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, styles.messageRowLeft]}>
      <View style={[styles.avatarPlaceholder, { backgroundColor: '#E1F5FE' }]}>
        <Ionicons name="person" size={16} color="#007AFF" />
      </View>
      <View style={[styles.messageBubbleLeft, imageUrl ? { backgroundColor: 'transparent', padding: 0 } : null]}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.messageImage} contentFit="contain" />
        )}
        {text ? (
          <View style={imageUrl ? [styles.messageBubbleLeft, { marginTop: 4 }] : null}>
            <Text style={styles.messageTextLeft}>
              {text}
            </Text>
          </View>
        ) : null}
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
  messageImage: {
    width: 220,
    height: 300,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  timeText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 12,
    width: '100%',
  },
  systemMessageBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: '90%',
  },
  systemMessageText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    fontWeight: '500',
  },
  systemTimeText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
});
