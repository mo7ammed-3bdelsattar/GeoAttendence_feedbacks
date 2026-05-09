export default {};
export const Platform = {
  OS: 'web',
  select: (objs: any) => objs.web || objs.default,
};

export const StyleSheet = {
  create: (styles: any) => styles,
};

export const View = 'div';
export const Text = 'p';
export const TouchableOpacity = 'button';
