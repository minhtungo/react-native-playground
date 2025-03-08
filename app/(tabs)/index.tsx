import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Button, Image, Text, Alert } from 'react-native';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import io from 'socket.io-client';

export default function HomeScreen() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [socket, setSocket] = useState<any>(null);
  const noteId = '1234';

  React.useEffect(() => {
    const newSocket = io('http://10.0.2.2:3001', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.emit('join-note', noteId);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleStrokeComplete = (stroke: any) => {
    console.log('Stroke completed:', stroke);
  };

  const handleLoadImage = () => {
    if (!inputUrl) {
      Alert.alert('Error', 'Please enter an image URL');
      return;
    }

    setIsLoading(true);

    Image.getSize(
      inputUrl,
      () => {
        setImageUrl(inputUrl);
        setIsLoading(false);

        if (socket && socket.connected) {
          console.log('Sending image update:', { noteId, image: { url: inputUrl, position: { x: 100, y: 100 } } });

          socket.emit('image-update', {
            noteId,
            image: {
              url: inputUrl,
              position: { x: 100, y: 100 }, // Default position
            },
          });
        } else {
          console.warn('Socket not connected, cannot send image update');
        }
      },
      (error) => {
        console.error('Error loading image:', error);
        Alert.alert('Error', 'Could not load image from the provided URL');
        setIsLoading(false);
      }
    );
  };

  return (
    <View style={styles.container}>
      {!imageUrl ? (
        <View style={styles.uploadContainer}>
          <Text style={styles.title}>Image URL</Text>
          <TextInput
            style={styles.input}
            placeholder='https://example.com/image.jpg'
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize='none'
            autoCorrect={false}
          />
          <Button
            title={isLoading ? 'Loading...' : 'Load Image'}
            onPress={handleLoadImage}
            disabled={isLoading || !socket?.connected}
          />
          {!socket?.connected && (
            <Text style={styles.error}>Not connected to server. Please wait or restart the app.</Text>
          )}
        </View>
      ) : (
        <View style={styles.drawingContainer}>
          <DrawingCanvas
            imageSource={{ uri: imageUrl }}
            onStrokeComplete={handleStrokeComplete}
            onChangeImage={() => setImageUrl('')}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  uploadContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  hint: {
    marginTop: 20,
    color: '#666',
    textAlign: 'center',
  },
  error: {
    marginTop: 10,
    color: 'red',
    textAlign: 'center',
  },
  drawingContainer: {
    flex: 1,
    position: 'relative',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
});
