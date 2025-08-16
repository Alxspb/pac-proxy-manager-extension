import { createRoot } from 'react-dom/client';
import PopupApp from './PopupApp';
import './popup.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<PopupApp />);
