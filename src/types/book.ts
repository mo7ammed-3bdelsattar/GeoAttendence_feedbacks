export interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  borrowPrice?: number; // Price to borrow (per week or fixed)
  isBorrowable: boolean;
  description: string;
  category: string;
  coverImage: string;
}

export type CartAction = 'buy' | 'borrow';

export interface CartItem extends Book {
  quantity: number;
  action: CartAction;
  duration?: number; // Duration in days (max 10)
}
