import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCartStore } from '../stores/cartStore';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import type { CartItem } from '../types';

const StudentCartScreen: React.FC = () => {
  const navigation = useNavigation();
  const { items, removeItem, addItem, clearCart, getTotal } = useCartStore();
  const [checkingOut, setCheckingOut] = useState(false);

  const handleCheckout = () => {
    if (items.length === 0) return;
    
    Alert.alert(
      'Confirm Purchase',
      `Total amount: $${getTotal().toFixed(2)}. Do you want to proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            setCheckingOut(true);
            // Simulate API call
            setTimeout(() => {
              setCheckingOut(false);
              clearCart();
              Alert.alert('Success', 'Your order has been placed successfully!');
              navigation.goBack();
            }, 1500);
          }
        }
      ]
    );
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.coverImage }} style={styles.image} />
      <View style={styles.info}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.action === 'buy' ? 'PURCHASE' : 'RENTAL'}</Text>
        </View>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.itemAuthor}>{item.author}</Text>
        
        <View style={styles.bottomRow}>
          <Text style={styles.itemPrice}>
            ${(item.action === 'buy' ? item.price : (item.borrowPrice || 0)).toFixed(2)}
          </Text>
          
          <View style={styles.quantityControls}>
            <TouchableOpacity 
              style={styles.qtyBtn} 
              onPress={() => removeItem(item.id, item.action)}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            
            <Text style={styles.qtyText}>{item.quantity}</Text>
            
            <TouchableOpacity 
              style={styles.qtyBtn} 
              onPress={() => addItem(item, item.action)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backEmoji}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Cart</Text>
        <TouchableOpacity onPress={clearCart} disabled={items.length === 0}>
          <Text style={[styles.clearText, items.length === 0 && { opacity: 0.3 }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Looks like you haven't added any books yet.</Text>
          <TouchableOpacity 
            style={styles.browseBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.browseBtnText}>Browse Books</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item, index) => `${item.id}-${item.action}-${index}`}
            contentContainerStyle={styles.list}
          />

          <View style={styles.footer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>${getTotal().toFixed(2)}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.checkoutBtn, checkingOut && styles.disabledBtn]}
              onPress={handleCheckout}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.checkoutBtnText}>Confirm Checkout</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  backEmoji: {
    fontSize: 20,
  },
  title: {
    ...Typography.Typography.h2,
    flex: 1,
    textAlign: 'center',
  },
  clearText: {
    color: Colors.error,
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: 70,
    height: 100,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  info: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  typeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  itemAuthor: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 12,
    minWidth: 16,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: Colors.card,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    ...Typography.Typography.h2,
    marginBottom: 8,
  },
  emptySub: {
    ...Typography.Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  browseBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  browseBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default StudentCartScreen;
