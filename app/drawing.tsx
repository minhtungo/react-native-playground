import React, { useState } from 'react';
import { View, StyleSheet, Button } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { DrawingCanvas } from '@/components/DrawingCanvas';

export default function DrawingScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleStrokeComplete = (stroke: any) => {
    // Here you can send the stroke data to your backend
    console.log('Stroke completed:', stroke);
  };

  return (
    <View style={styles.container}>
      {!selectedImage ? (
        <Button title='Pick an image' onPress={pickImage} />
      ) : (
        <DrawingCanvas imageSource={{ uri: selectedImage }} onStrokeComplete={handleStrokeComplete} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
