import Link from 'next/link';

export default function Home() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
      <div className='max-w-md w-full mx-4'>
        <div className='bg-white rounded-2xl shadow-xl p-8'>
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              BSC Wallet
            </h1>
            <p className='text-gray-600'>
              Binance Smart Chain cüzdanınızı oluşturun veya mevcut cüzdanınızı
              ekleyin
            </p>
          </div>

          <div className='space-y-4'>
            <Link
              href='/create-wallet'
              className='w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 block text-center'
            >
              Yeni BSC Cüzdan Oluştur
            </Link>

            <Link
              href='/import-wallet'
              className='w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-4 px-6 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 block text-center border-2 border-gray-200'
            >
              Mevcut Cüzdanı İçe Aktar
            </Link>

            <Link
              href='/transactions'
              className='w-full bg-purple-100 hover:bg-purple-200 text-purple-900 font-semibold py-4 px-6 rounded-xl transition duration-200 ease-in-out transform hover:scale-105 block text-center border-2 border-purple-200'
            >
              İşlem Geçmişi Explorer
            </Link>
          </div>

          <div className='mt-8 text-center'>
            <p className='text-sm text-gray-500'>
              Güvenli • Merkezi Olmayan • Gerçek BSC Verisi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
