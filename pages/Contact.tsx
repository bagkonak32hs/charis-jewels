import React from 'react';

const Contact: React.FC = () => {
  return (
    <div className="container mx-auto px-8 py-16 animate-in fade-in">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-5xl serif mb-6">İletisim</h1>
        <p className="text-gray-500 text-sm tracking-[0.2em] uppercase mb-10">Bize Ulasin</p>
        <div className="space-y-4 text-gray-600 text-base leading-relaxed">
          <p>E-posta: info@charisjewels.com</p>          
          <p>Adres: Ataşehir, Istanbul</p>
          
        </div>
      </div>
    </div>
  );
};

export default Contact;
