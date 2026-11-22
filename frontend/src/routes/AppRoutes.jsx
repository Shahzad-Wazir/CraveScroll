import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ChooseRegister from '../pages/auth/ChooseRegister';
import UserRegister from '../pages/auth/UserRegister';
import UserLogin from '../pages/auth/UserLogin';
import FoodPartnerRegister from '../pages/auth/FoodPartnerRegister';
import FoodPartnerLogin from '../pages/auth/FoodPartnerLogin';
import DeliveryPartnerLogin from '../pages/auth/DeliveryPartnerLogin';
import DeliveryPartnerRegister from '../pages/auth/DeliveryPartnerRegister';
import Explore from '../pages/general/Explore';
import Home from '../pages/general/Home';
import Search from '../pages/general/Search';
import Cart from '../pages/general/Cart';
import Orders from '../pages/general/Orders';
import UserProfile from '../pages/general/UserProfile';
import Saved from '../pages/general/Saved';
import ReelDetail from '../pages/general/ReelDetail';
import CreateFood from '../pages/food-partner/CreateFood';
import Profile from '../pages/food-partner/Profile';
import BottomNav from '../components/BottomNav';
import ProtectedRoute from '../components/ProtectedRoute';

const withNav = (element) => (
  <>
    {element}
    <BottomNav />
  </>
);

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<ChooseRegister />} />
        <Route path="/user/register" element={<UserRegister />} />
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/food-partner/register" element={<FoodPartnerRegister />} />
        <Route path="/food-partner/login" element={<FoodPartnerLogin />} />
        <Route path="/delivery-partner/register" element={<DeliveryPartnerRegister />} />
        <Route path="/delivery-partner/login" element={<DeliveryPartnerLogin />} />

        {/* 5 Core Experiences */}
        <Route path="/" element={withNav(<Explore />)} />
        <Route path="/reels" element={withNav(<Home />)} />
        <Route path="/search" element={withNav(<Search />)} />
        <Route path="/cart" element={withNav(<Cart />)} />
        <Route path="/orders" element={withNav(<Orders />)} />
        <Route path="/profile" element={withNav(<UserProfile />)} />

        <Route path="/reel/:id" element={withNav(<ReelDetail />)} />
        <Route path="/food-partner/:id" element={withNav(<Profile />)} />

        <Route
          path="/saved"
          element={
            <ProtectedRoute allowedRoles={['user']}>
              {withNav(<Saved />)}
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-food"
          element={
            <ProtectedRoute allowedRoles={['foodpartner']}>
              {withNav(<CreateFood />)}
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
